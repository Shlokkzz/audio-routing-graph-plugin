class AudioRoutingGraphPlugin {
    /**
     * Creates an instance of AudioRoutingGraphPlugin.
     * @param {MediaStream} stream - The audio stream to be processed.
     */
    constructor(stream) {
        this.nodes = [];
        const AC = (window.AudioContext || window.webkitAudioContext);
        
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
    @param {node} - The node to connect.
    */
    _pushBack(node){
        this.nodes[this.nodes.length-1].connect(node);
        this.nodes.push(node);
    }

    /**
     * Adds a GainNode to the audio processing chain.
     * @param {number} [gain=1] - The gain value to set.
     */
    _addGainNode({ gain }) {
        const gainNode = this.audioCtx.createGain();
        
        gainNode.gain.value = gain || 1;

        // connecting node to the chain
        this._pushBack(gainNode);
    }

    /**
     * Adds a BiquadFilterNode to the audio processing chain.
     * @param {string} [type='lowpass'] - The type of filter (e.g., 'lowpass', 'highpass').
     * @param {number} [frequency=350] - The frequency value in Hz.
     * @param {number} [Q=1] - The quality factor.
     */
    _addBiquadFilterNode({ type, frequency, Q }) {
        const biquadFilterNode = this.audioCtx.createBiquadFilter();
        
        biquadFilterNode.type = type || 'lowpass';
        biquadFilterNode.frequency.value = frequency || 350;
        biquadFilterNode.Q.value = Q || 1;

        // connecting node to the chain
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
    _addDynamicCompressorNode({ threshold, knee, ratio, attack, release }) {
        const compressorNode = this.audioCtx.createDynamicsCompressor();
        
        compressorNode.threshold.setValueAtTime(threshold || -50, this.audioCtx.currentTime);
        compressorNode.knee.setValueAtTime(knee || 40, this.audioCtx.currentTime);
        compressorNode.ratio.setValueAtTime(ratio || 12, this.audioCtx.currentTime);
        compressorNode.attack.setValueAtTime(attack || 0, this.audioCtx.currentTime);
        compressorNode.release.setValueAtTime(release || 0.25, this.audioCtx.currentTime);

        // connecting node to the chain
        this._pushBack(compressorNode);
    }

    /**
     * Adds a DelayNode to the audio processing chain.
     * @param {number} delayTime - The amount of delay to apply, in seconds.
     * @param {number} maxDelayTime - The maximum amount of delay, in seconds.
     */
    _addDelayNode({ delayTime, maxDelayTime }){
        const delayNode = new DelayNode(this.audioCtx, {
            delayTime: delayTime,
            maxDelayTime: maxDelayTime,
          });

        // connecting node to the chain
        this._pushBack(delayNode);
    }

    /**
     * Adds a ConvolverNode to the audio processing chain.
     * @param {string} buffer - The path to the impulse response audio file.
     * @param {boolean} normalize - Whether to normalize the impulse response buffer.
     */
    async _addConvolverNode({ buffer, normalize }){
        const convolverNode = this.audioCtx.createConvolver();
        
        const response = await fetch(buffer);
        const arraybuffer = await response.arrayBuffer();
        
        convolverNode.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
        convolverNode.normalize = normalize;
        
        // connecting node to the chain
        this._pushBack(convolverNode);
    }   

    /**
     * Adds a WaveShaperNode to the audio processing chain.
     * @param {Float32Array} curve - The distortion curve to apply.
     * @param {string} oversample - The oversampling rate (e.g., 'none', '2x', '4x').
     */
    _addWaveShaperNode({ curve, oversample }){
        const waveShaperNode = new WaveShaperNode(this.audioCtx, {
            curve: curve,
            oversample: oversample,
        })

        // connecting node to the chain
        this._pushBack(waveShaperNode);
    }

    /**
     * Adds an AudioWorkletNode to the audio processing chain, allowing custom audio processing scripts.
     * @param {string} scriptLocation - The URL or path to the AudioWorkletProcessor script.
     * @param {string} processorName - The name of the processor defined in the script.
     */
    async _addProcessingScript({ scriptLocation, processorName }){
        try {
            await this.audioCtx.audioWorklet.addModule(
                scriptLocation
            );
        } catch (e) {
            throw e;
        }
        
        try {
            const audioWorkletNode = new AudioWorkletNode(
                this.audioCtx,
                processorName
            );

            // connecting node to the chain
            this._pushBack(audioWorkletNode);
        } catch(e){
            throw e;
        }
    }
    
    /**
     * Connects the last node in the chain to the destination, combines audio and video tracks, and returns the processed MediaStream.
     * @returns {MediaStream} The processed audio and video stream.
     */
    getProcessedStream() {

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


    addNode(nodeName, nodeOptions) {
        switch(nodeName) {
            case 'GAIN': 
                this._addGainNode(nodeOptions);
                break;
            
            case 'BIQUAD_FILTER': 
                this._addBiquadFilterNode(nodeOptions);
                break;
            
            case 'DYNAMIC_COMPRESSOR':
                this._addDynamicCompressorNode(nodeOptions);
                break;
                
            case 'DELAY':
                this._addDelayNode(nodeOptions);
                break;
                
            case 'CONVOLVER':
                this._addConvolverNode(nodeOptions);
                break;
                
            case 'WAVE_SHAPER':
                this._addWaveShaperNode(nodeOptions);
                break;
                
            case 'PROCESSING_SCRIPT':
                this._addProcessingScript(nodeOptions);
                break;
        }
    }
    
    /**
     * Applies a preset configuration of audio nodes to the processing chain.
     */
    async usePreset(preset){
        switch(preset) {
            case 'GAIN_BIQUAD_DELAY': {
                 this.addNode('GAIN', { gain: 1.5 });
                 this.addNode('BIQUAD_FILTER', { type: 'highpass', frequency: 1000, Q: 1 });
                 this.addNode('DELAY', { delayTime: 0.3, maxDelayTime: 1 });
            }
               
        }

        return this.getProcessedStream();
    }
}

export default AudioRoutingGraphPlugin;