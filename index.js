const { Transform } = require('stream');

class Filter extends Transform
{
	constructor(stream_type)
	{
		super();
		switch(stream_type)
		{
			case 's8':
				this._readPacket = (buf, offset) => buf.readInt8(offset);
				this._writePacket = (buf, offset, value) => buf.writeInt8(value, offset);
				this._bytes = 1;
				this._signed = true;
				break;
			case 'u8':
				this._readPacket = (buf, offset) => buf.readUInt8(offset);
				this._writePacket = (buf, offset, value) => buf.writeUInt8(value, offset);
				this._bytes = 1;
				this._signed = false;
				break;
			case 's16le':
				this._readPacket = (buf, offset) => buf.readInt16LE(offset);
				this._writePacket = (buf, offset, value) => buf.writeInt16LE(value, offset);
				this._bytes = 2;
				this._signed = true;
				break;
			case 's16be':
			case 'u16le':
			case 'u16be':
			case 's32le':
			case 's32be':
			case 'u32le':
			case 'u32be':
			default:
				throw new Error("This PCM format is not supported (" + stream_type + ")");
		}

		this._min = this._signed ? -Math.pow(2, this._bytes*8-1) : 0;
		this._max = Math.pow(2, this._bytes*8-(this._signed ? 1 : 0))-1;
		this._borne = (x) => Math.min(this._max, Math.max(this._min, x));
	}

	_transform(chunk, encoding, callback)
	{
		chunk = this._f_volume(chunk);
		chunk = this._f_distortion(chunk);
		//const speed = 1.25;
		//const speed_offset = (speed-1)
		//console.log(chunk.length/2/(Date.now() - this.last_time));
		//this.last_time = Date.now();
		//let new_buffer = Buffer.alloc(chunk.length*(1 - speed_offset));
		/*for(let i = 0; i < chunk.length-3; i+=4)
		{
			chunk[i] =   this.side ? chunk[i] : 0;
			chunk[i+1] = this.side ? chunk[i+1] : 0;
			chunk[i+2] = !this.side ? chunk[i+2] : 0;
			chunk[i+3] = !this.side ? chunk[i+3] : 0;
		}*/

		/*let frame_count = 1;
		let offset = 0;
		for(let i = 0; i < chunk.length-3; i+=4)
		{
			if(frame_count < (1/speed_offset))
			{
				new_buffer[offset] =   chunk[i];
				new_buffer[offset+1] = chunk[i+1];
				new_buffer[offset+2] = chunk[i+2];
				new_buffer[offset+3] = chunk[i+3];
				offset+=4;
				frame_count++;
			}
			else frame_count = 1;
			
		}
		console.log(new_buffer);*/
		callback(null, chunk)
	}

	_volume_level = 1;
	setVolume(level)
	{
		if(isNaN(level)) this._volume_level = 1;
		else this._volume_level = level;
		return this._volume_level;
	}
	_f_volume(chunk)
	{
		if(this._volume_level === 1) return chunk;
		let new_buffer = Buffer.alloc(chunk.length, 0);
		for(let i = 0; i <= chunk.length-this._bytes; i+=this._bytes)
		{
			this._writePacket(new_buffer, i, this._borne(this._readPacket(chunk, i)*this._volume_level));
		}
		return new_buffer;
	}

	_speed = 1;
	setSpeed(level)
	{
		if(isNaN(level)) this._speed = 1;
		else this._speed = level;
		return this._speed;
	}
	_f_speed(chunk)
	{
		if(this._speed === 1) return chunk;
		const inverted_speed = (1/this._speed);
		let new_buffer = Buffer.alloc(Math.ceil((chunk.length*inverted_speed)/4)*4, 0);
		console.log(new_buffer.length / chunk.length);

		if(inverted_speed < 1)
		{
			let frame_count = 1000;
			let offset = 0;
			for(let i = 0; i < chunk.length-this._bytes*2; i+=this._bytes*2)
			{
				if(Math.floor(1000/frame_count) > Math.ceil(1000*(1-inverted_speed)))
				{
					if(offset+4 < new_buffer.length)
					{
						this._writePacket(new_buffer, offset, this._readPacket(chunk, i));
						this._writePacket(new_buffer, offset+this._bytes, this._readPacket(chunk, i+this._bytes));
						frame_count++;
						offset+=this._bytes*2;
					}
				}
				else frame_count = 1;
			}
		}
		else if(inverted_speed > 1)
		{
			let frame_count = 1000;
			let offset = 0;
			for(let i = 0; i < chunk.length-this._bytes*2; i+=this._bytes*2)
			{
				if(Math.ceil(1000/frame_count) < Math.floor(1000*(1-inverted_speed)))
				{
					this._writePacket(new_buffer, offset, this._readPacket(chunk, i));
					this._writePacket(new_buffer, offset+this._bytes, this._readPacket(chunk, i+this._bytes));
				}
				this._writePacket(new_buffer, offset, this._readPacket(chunk, i));
				this._writePacket(new_buffer, offset+this._bytes, this._readPacket(chunk, i+this._bytes));
				offset+=this._bytes*2;
				frame_count++;
			}
		}
			
		return new_buffer;
	}

	_distortion_level = 100;
	setDistortion(level)
	{
		if(isNaN(level)) this._distortion_level = 100;
		else this._distortion_level = level;
		return this._distortion_level;
	}
	_f_distortion(chunk)
	{
		if(this._distortion_level === 100) return chunk;
		const bytes_level_max = this._distortion_level * this._max / 100;
		const bytes_level_min = this._distortion_level * this._min / 100;
		//const work_zone = bytes_level*0.2;

		for(let i = 0; i < chunk.length-this._bytes*2; i+=this._bytes*2)
		{
			for(let j = 0; j < this._bytes*2; j+=this._bytes)
			{
				const x = this._readPacket(chunk, i+j);
				let x2;
				if(x > bytes_level_max)
				{
					x2 = bytes_level_max;
				}
				/*else if(x > bytes_level*0.8)
				{
					x2 = bytes_level*0.8 + work_zone*Math.log10(x*(9/work_zone));
				}*/
				else if(x < bytes_level_min)
				{
					x2 = bytes_level_min;
				}
				else x2 = x;
				this._writePacket(chunk, i+j, x2);
			}
			
		}
			
		return chunk;
	}

	_merge_streams = [];
	_merge_buffer = {};
	addStream(stream)
	{
		if(stream instanceof Filter)
		{
			this._merge_streams.push(stream);
			stream.on('data', ((data) => {
				if(!this._merge_buffer["2"]) this._merge_buffer["2"] = Buffer.alloc(0);
				this._merge_buffer["2"] = Buffer.concat([this._merge_buffer["2"], data]); 
			}).bind(this));
		}
	}
	removeStream(stream)
	{
		this._merge_streams.splice(this._merge_streams.indexOf(stream), 1);
	}
	_f_merge(chunk)
	{
		if(Object.keys(this._merge_buffer).length === 0) return chunk;
		for(let i = 0; i < chunk.length - this._bytes; i+= this._bytes)
		{
			const thiss = this;
			let stream_values = Object.values(this._merge_buffer).map((e) => {
				return e._readPacket(e, i);
			});
			stream_values = stream_values.filter(e => e !== null);
			stream_values.push(this._readPacket(chunk, i));
			let stream_sum = stream_values.reduce((acc, x) => acc + x, 0);
			stream_sum /= stream_values.length;
			this._writePacket(chunk, i, stream_sum);
		}

		return chunk;
	}


	static Merge(type, ...streams)
	{
		const new_stream = new Filter(type)
		streams[0].on('data', (chunk) => {
			for(let i = 0; i < chunk.length - new_stream._bytes; i+= new_stream._bytes)
			{
				let stream_values = streams.slice(1).map((e) => {
					const read_bytes = e.read(new_stream._bytes);
					if(read_bytes === null) return null;
					return e._readPacket(read_bytes, 0);
				});
				stream_values = stream_values.filter(e => e !== null);
				stream_values.push(new_stream._readPacket(chunk, i));
				let stream_sum = stream_values.reduce((acc, x) => acc + x, 0);
				new_stream._writePacket(chunk, i, stream_sum / stream_values.length);
			}
			new_stream.write(chunk);
		});
		return new_stream;
	}


	//SHIT//
	_fraction_resolve(x)
	{
		let result = Math.round(x*1000)
		let denom = 1000;
		let divisible = true;
		while(divisible)
		{
			if(result % 10 === 0 && denom % 10 === 0)
			{
				result /= 10;
				denom /= 10;
			}
			else if(result % 5 === 0 && denom % 5 === 0)
			{
				result /= 5;
				denom /= 5;
			}
			else if(result % 2 === 0 && denom % 2 === 0)
			{
				result /= 2;
				denom /= 2;
			}
			else divisible = false;
			
		}
		return [result, denom];
	}
}
module.exports = Filter;