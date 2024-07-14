type AudioContextType = typeof AudioContext;

type NodeType =
  | "GAIN"
  | "BIQUAD_FILTER"
  | "DYNAMIC_COMPRESSOR"
  | "DELAY"
  | "CONVOLVER"
  | "WAVE_SHAPER"
  | "PROCESSING_SCRIPT";

interface GainNodeOptions {
  gain?: number;
}

interface BiquadFilterNodeOptions {
  type?: BiquadFilterType;
  frequency?: number;
  Q?: number;
}

interface DynamicCompressorNodeOptions {
  threshold?: number;
  knee?: number;
  ratio?: number;
  attack?: number;
  release?: number;
}

interface DelayNodeOptions {
  delayTime: number;
  maxDelayTime: number;
}

interface ConvolverNodeOptions {
  buffer: string;
  normalize: boolean;
}

interface WaveShaperNodeOptions {
  curve: Float32Array;
  oversample: OverSampleType;
}

interface ProcessingScriptOptions {
  scriptLocation: string;
  processorName: string;
}

type NodeOptionsMap = {
  GAIN: GainNodeOptions;
  BIQUAD_FILTER: BiquadFilterNodeOptions;
  DYNAMIC_COMPRESSOR: DynamicCompressorNodeOptions;
  DELAY: DelayNodeOptions;
  CONVOLVER: ConvolverNodeOptions;
  WAVE_SHAPER: WaveShaperNodeOptions;
  PROCESSING_SCRIPT: ProcessingScriptOptions;
};

type PresetType =
  | "GAIN_BIQUAD_DELAY"
  | "GAIN_DELAY"
  | "DYNAMIC_DELAY"
  | "ECHO"
  | "BIQUAD_DELAY";

class AudioRoutingGraphPlugin {
  private nodes: AudioNode[];
  private audioCtx: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private destination: MediaStreamAudioDestinationNode;
  private originalStream: MediaStream;

  /**
  * Creates an instance of AudioRoutingGraphPlugin.
  * @param {MediaStream} stream - The audio stream to be processed.
  */
  constructor(stream: MediaStream) {
    this.nodes = [];
    const AC: AudioContextType = window.AudioContext;

    this.audioCtx = new AC();

    this.source = this.audioCtx.createMediaStreamSource(stream);
    this.nodes.push(this.source);

    this.destination = this.audioCtx.createMediaStreamDestination();

    this.originalStream = stream;
  }
  /**
  * Connects a node to the routing graph.
  * The last node on this.nodes is connected to this node and
  * then it is added to the list as well.
  * @param {node} - The node to connect.
  */
  private _pushBack(node: AudioNode): void {
    this.nodes[this.nodes.length - 1].connect(node);
    this.nodes.push(node);
  }

  /**
  * Adds a GainNode to the audio processing chain.
  * @param {number} [gain=1] - The gain value to set.
  */
  private _addGainNode({ gain = 1 }: GainNodeOptions): void {
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = gain;
    this._pushBack(gainNode);
  }

  /**
  * Adds a BiquadFilterNode to the audio processing chain.
  * @param {string} [type='lowpass'] - The type of filter (e.g., 'lowpass', 'highpass').
  * @param {number} [frequency=350] - The frequency value in Hz.
  * @param {number} [Q=1] - The quality factor.
  */
  private _addBiquadFilterNode({
    type = "lowpass",
    frequency = 350,
    Q = 1,
  }: BiquadFilterNodeOptions): void {
    const biquadFilterNode = this.audioCtx.createBiquadFilter();
    biquadFilterNode.type = type;
    biquadFilterNode.frequency.value = frequency;
    biquadFilterNode.Q.value = Q;
    this._pushBack(biquadFilterNode);
  }

  /**
  * Adds a DynamicsCompressorNode to the audio processing chain.
  * @param {number} [threshold=-50] - The threshold in dB.
  * @param {number} [knee=40] - The knee in dB.
  * @param {number} [ratio=12] - The compression ratio.
  * @param {number} [attack=0] - The attack time in seconds.
  * @param {number} [release=0.25] - The release time in seconds.
  */
  private _addDynamicCompressorNode({
    threshold = -50,
    knee = 40,
    ratio = 12,
    attack = 0,
    release = 0.25,
  }: DynamicCompressorNodeOptions): void {
    const compressorNode = this.audioCtx.createDynamicsCompressor();
    compressorNode.threshold.setValueAtTime(
      threshold,
      this.audioCtx.currentTime
    );
    compressorNode.knee.setValueAtTime(knee, this.audioCtx.currentTime);
    compressorNode.ratio.setValueAtTime(ratio, this.audioCtx.currentTime);
    compressorNode.attack.setValueAtTime(attack, this.audioCtx.currentTime);
    compressorNode.release.setValueAtTime(release, this.audioCtx.currentTime);
    this._pushBack(compressorNode);
  }

  /**
  * Adds a DelayNode to the audio processing chain.
  * @param {number} delayTime - The amount of delay to apply, in seconds.
  * @param {number} maxDelayTime - The maximum amount of delay, in seconds.
  */
  private _addDelayNode({ delayTime, maxDelayTime }: DelayNodeOptions): void {
    const delayNode = new DelayNode(this.audioCtx, {
      delayTime: delayTime,
      maxDelayTime: maxDelayTime,
    });
    this._pushBack(delayNode);
  }

  /**
  * Adds a ConvolverNode to the audio processing chain.
  * @param {string} buffer - The path to the impulse response audio file.
  * @param {boolean} normalize - Whether to normalize the impulse response buffer.
  */
  private async _addConvolverNode({
    buffer,
    normalize,
  }: ConvolverNodeOptions): Promise<void> {
    const convolverNode = this.audioCtx.createConvolver();
    const response = await fetch(buffer);
    const arraybuffer = await response.arrayBuffer();
    convolverNode.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
    convolverNode.normalize = normalize;
    this._pushBack(convolverNode);
  }

  /**
  * Adds a WaveShaperNode to the audio processing chain.
  * @param {Float32Array} curve - The distortion curve to apply.
  * @param {string} oversample - The oversampling rate (e.g., 'none', '2x', '4x').
  */
  private _addWaveShaperNode({
    curve,
    oversample,
  }: WaveShaperNodeOptions): void {
    const waveShaperNode = new WaveShaperNode(this.audioCtx, {
      curve: curve,
      oversample: oversample,
    });
    this._pushBack(waveShaperNode);
  }


  /**
  * Adds an AudioWorkletNode to the audio processing chain, allowing custom audio processing scripts.
  * @param {string} scriptLocation - The URL or path to the AudioWorkletProcessor script.
  * @param {string} processorName - The name of the processor defined in the script.
  */
  private async _addProcessingScript({
    scriptLocation,
    processorName,
  }: ProcessingScriptOptions): Promise<void> {
    try {
      await this.audioCtx.audioWorklet.addModule(scriptLocation);
      const audioWorkletNode = new AudioWorkletNode(
        this.audioCtx,
        processorName
      );
      this._pushBack(audioWorkletNode);
    } catch (e) {
      throw e;
    }
  }

  
  /**
  * Connects the last node in the chain to the destination, combines audio and video tracks, and returns the processed MediaStream.
  * @returns {MediaStream} The processed audio and video stream.
  */
  public getProcessedStream(): MediaStream {

    // connecting destination at the end of the chain
    this._pushBack(this.destination);

    const processedStream = new MediaStream();

    // separating audio and video tracks
    // first getting the processed Audio tracks and adding to processedStream
    this.destination.stream.getAudioTracks().forEach((track) => {
      processedStream.addTrack(track);
    });

    // second getting the original Video tracks and adding to processedStream
    this.originalStream.getVideoTracks().forEach((track) => {
      processedStream.addTrack(track);
    });
    return processedStream;
  }
  

  /**
   * Adds a node to the audio processing chain.
   * 
   * @template T
   * @param {T} nodeName - The type of the audio node to add (e.g., 'GAIN', 'BIQUAD_FILTER').
   * @param {NodeOptionsMap[T]} nodeOptions - The options specific to the audio node type.
   *
   * @returns {Promise<void>} A promise that resolves when the node is added.
  */
  public async addNode<T extends NodeType>(
    nodeName: T,
    nodeOptions: NodeOptionsMap[T]
  ): Promise<void> {
    switch (nodeName) {
      case "GAIN":
        this._addGainNode(nodeOptions as GainNodeOptions);
        break;
      case "BIQUAD_FILTER":
        this._addBiquadFilterNode(nodeOptions as BiquadFilterNodeOptions);
        break;
      case "DYNAMIC_COMPRESSOR":
        this._addDynamicCompressorNode(
          nodeOptions as DynamicCompressorNodeOptions
        );
        break;
      case "DELAY":
        this._addDelayNode(nodeOptions as DelayNodeOptions);
        break;
      case "CONVOLVER":
        await this._addConvolverNode(nodeOptions as ConvolverNodeOptions);
        break;
      case "WAVE_SHAPER":
        this._addWaveShaperNode(nodeOptions as WaveShaperNodeOptions);
        break;
      case "PROCESSING_SCRIPT":
        await this._addProcessingScript(nodeOptions as ProcessingScriptOptions);
        break;
    }
  }

  /**
  * Applies a preset configuration of audio nodes to the processing chain.
  */
  public async usePreset(preset: PresetType): Promise<MediaStream> {
    switch (preset) {
      case "GAIN_BIQUAD_DELAY": {
        await this.addNode("GAIN", { gain: 1.5 });
        await this.addNode("BIQUAD_FILTER", {
          type: "highpass",
          frequency: 1000,
          Q: 1,
        });
        await this.addNode("DELAY", { delayTime: 0.3, maxDelayTime: 1 });
        break;
      }
      case "GAIN_DELAY": {
        await this.addNode("GAIN", { gain: 0.5 });
        await this.addNode("DELAY", { delayTime: 0.25, maxDelayTime: 0.5 });
        break;
      }
      case "DYNAMIC_DELAY": {
        await this.addNode("DYNAMIC_COMPRESSOR", {
          threshold: -24,
          knee: 20,
          ratio: 12,
          attack: 0.3,
          release: 0.25,
        });
        await this.addNode("DELAY", { delayTime: 0.3, maxDelayTime: 1 });
        break;
      }
      case "ECHO": {
        await this.addNode("DELAY", { delayTime: 0.25, maxDelayTime: 0.5 });
        await this.addNode("GAIN", { gain: 0.5 });
        break;
      }
      case "BIQUAD_DELAY": {
        await this.addNode("BIQUAD_FILTER", {
          type: "highpass",
          frequency: 2000,
          Q: 2,
        });
        await this.addNode("DELAY", { delayTime: 0.25, maxDelayTime: 0.5 });
        break;
      }
    }

    return this.getProcessedStream();
  }
}

export default AudioRoutingGraphPlugin;
