# PCM-Effects
**Manipulate, transform and add effects to your PCM streams**

This package simplifies the process of manipulating PCM streams.

Using this package with [discord.js](https://github.com/discordjs/discord.js) is possible, as it was originally made for usage in discord bots.

## Supported PCM stream type
- [x] s8
- [x] u8
- [x] s16le
- [ ] s16be
- [ ] u16le
- [ ] u16be
- [ ] s32le
- [ ] s32be
- [ ] u32le
- [ ] u32be

## Usage example
```
import PCMEffects from 'pcm-effects';//Importing the module

//--- Create a ffmpeg process to get a PCM stream ---//
const ffmpeg = child_process.spawn('ffmpeg', [
	'-i', ANY_INPUT_OR_STDIN,
	'-analyzeduration', '0',
	'-loglevel', '0',
	'-f', 's16le',//Required : set the PCM stream type
	'-ar', '48000',//Sample rate: not useful for PCM-Effects, but may need be to changed depending on the use case (ex: Discord voice require 48000Hz)
	'-ac', '2',//Force the input to be in stereo
	'pipe:1'//Redirect the output to stdout
], {
	shell: false,
	windowsHide: true
});
//---//

//--- PCM-Effects ---//
const pcm = new PCMEffects("s16le");//Create a new instance of PCM-Effects
pcm.setVolume(1);//Change the volume, can be changed during playing
pcm.setDistortion(1);//Change the distortion, can be changed during playing
ffmpeg.stdout.pipe(pcm);//Redirect the output of ffmpeg to the input of the PCM-Effects class
//---//

//--- Using the output in Discord.js ---//
const prism = require('prism-media');
const { createAudioResource } = require('discord.js');

const encoder = new prism.opus.Encoder({channels: 2, rate: 48000, frameSize: 960});//Encode the PCM stream in Opus format
pcm.pipe(encoder);//Pass the PCM-Effects stream to the encoder
let resource = createAudioResource(encoder, {inputType: "opus"});//Create a Discord.js audioResource
//You can now use this resource in Discord.js (see https://discordjs.guide/voice/audio-resources.html)
//---//
```

## API

### `PCMEffects.Merge(type, ...streams)`
Merge two PCMEffects streams together, and return a new one with his own effects control.

**Warning** : The first stream should not interrupt transmission, because frames are synced based on it. If this stream cease to emit, sound of the others streams will not be processed

<ins>Example</ins> :
```
const pcm1 = new PCMEffects("s16le");
const pcm2 = new PCMEffects("s16le");
const new_pcm = PCMEffects.Merge("s16le", pcm1, pcm2);
```

<ins>Arguments</ins> :
- type : The stream type. Possibles values are listed in [Supported PCM stream type](#supported-pcm-stream-type)
- streams : An indefinite list of PCMEffects streams

### `new PCMEffects(type)`
Initialize the PCM.

The returned class extends [Transform](https://nodejs.org/api/stream.html#class-streamtransform), the class is also a readable and a writable stream.

<ins>Example</ins> : `const pcm = new PCMEffects("s16le")`

<ins>Arguments</ins> :
- type : The stream type. Possibles values are listed in [Supported PCM stream type](#supported-pcm-stream-type)

### `pcm.setVolume(level)`
Set the volume of the stream.

This setting can be changed at any moment

<ins>Example : `pcm.setVolume(2)//The volume is double as original`

<ins>Arguments</ins> :
- level : Volume level. This value multiplies the actual volume (0.5 play at half the volume, 2 double it)

### `pcm.setDistortion(level)`
Set the distortion of the stream.

This setting can be changed at any moment

<ins>Example</ins> : `pcm.setSaturation(60)//The volume is double as original`

<ins>Arguments</ins> :
- level : Distortion threshold in percent. The volume is limited to this threshold


## Help and disclaimer
To have a preview of this module working, take a look at the discord bot [BaBot](https://top.gg/bot/1052586565395828778)([Source code](https://github.com/Theiremi/babot)).

I'm far from being expert in programming and, especially in this package, my code is dirty and buggy.

**But feel free :**
- To report any issues in this Github repo
- To make code changes
- To contact me for any questions or suggestions (Theiremi#4835)
