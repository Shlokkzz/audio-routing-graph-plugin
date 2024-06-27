class MyClass1 {
    /**
     * Creates an instance of MyClass1.
     * @param {MediaStream} stream - The audio stream to be processed.
     */
    constructor(stream) {
        this.nodes = [];
        const AC = (window.AudioContext || window.webkitAudioContext);
        this.audioCtx = new AC();
        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.destination = this.audioCtx.createMediaStreamDestination();
        this.originalStream = stream;
        this.nodes.push(this.source);
    }

    /**
     * Adds a GainNode to the audio processing chain.
     * @param {number} [gain=1] - The gain value to set.
     */
    addGainNode(gain) {
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = gain || 1;

        // connecting node to the chain
        this.nodes[this.nodes.length-1].connect(gainNode);
        this.nodes.push(gainNode);
    }

    /**
     * Adds a BiquadFilterNode to the audio processing chain.
     * @param {string} [type='lowpass'] - The type of filter (e.g., 'lowpass', 'highpass').
     * @param {number} [frequency=350] - The frequency value in Hz.
     * @param {number} [Q=1] - The quality factor.
     */
    addBiquadFilterNode(type, frequency, Q) {
        const biquadFilterNode = this.audioCtx.createBiquadFilter();
        biquadFilterNode.type = type || 'lowpass';
        biquadFilterNode.frequency.value = frequency || 350;
        biquadFilterNode.Q.value = Q || 1;

        // connecting node to the chain
        this.nodes[this.nodes.length-1].connect(biquadFilterNode);
        this.nodes.push(biquadFilterNode);
    }

    /**
     * Adds a DynamicsCompressorNode to the audio processing chain.
     * @param {number} [threshold=-50] - The threshold in dB.
     * @param {number} [knee=40] - The knee in dB.
     * @param {number} [ratio=12] - The compression ratio.
     * @param {number} [attack=0] - The attack time in seconds.
     * @param {number} [release=0.25] - The release time in seconds.
     */
    addDynamicCompressorNode(threshold, knee, ratio, attack, release) {
        const compressorNode = this.audioCtx.createDynamicsCompressor();
        compressorNode.threshold.setValueAtTime(threshold || -50, this.audioCtx.currentTime);
        compressorNode.knee.setValueAtTime(knee || 40, this.audioCtx.currentTime);
        compressorNode.ratio.setValueAtTime(ratio || 12, this.audioCtx.currentTime);
        compressorNode.attack.setValueAtTime(attack || 0, this.audioCtx.currentTime);
        compressorNode.release.setValueAtTime(release || 0.25, this.audioCtx.currentTime);

        // connecting node to the chain
        this.nodes[this.nodes.length-1].connect(compressorNode);
        this.nodes.push(compressorNode);
    }

    /**
     * Adds a DelayNode to the audio processing chain.
     * @param {number} delayTime - The amount of delay to apply, in seconds.
     * @param {number} maxDelayTime - The maximum amount of delay, in seconds.
     */
    addDelayNode(delayTime,maxDelayTime){
        const delayNode = new DelayNode(this.audioCtx, {
            delayTime: delayTime,
            maxDelayTime: maxDelayTime,
          });

        // connecting node to the chain
        this.nodes[this.nodes.length-1].connect(delayNode);
        this.nodes.push(delayNode);
    }

    /**
     * Adds a ConvolverNode to the audio processing chain.
     * @param {string} buffer - The path to the impulse response audio file.
     * @param {boolean} normalize - Whether to normalize the impulse response buffer.
     */
    async addConvolverNode(buffer,normalize){
        const convolverNode = this.audioCtx.createConvolver();
        let response = await fetch(buffer);
        let arraybuffer = await response.arrayBuffer();
        convolverNode.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
        convolverNode.normalize=normalize;
        
        // connecting node to the chain
        this.nodes[this.nodes.length-1].connect(convolverNode);
        this.nodes.push(convolverNode);
    }   

    /**
     * Adds a WaveShaperNode to the audio processing chain.
     * @param {Float32Array} curve - The distortion curve to apply.
     * @param {string} oversample - The oversampling rate (e.g., 'none', '2x', '4x').
     */
    addWaveShaperNode(curve, oversample){
        const waveShaperNode = new WaveShaperNode(this.audioCtx, {
            curve: curve,
            oversample: oversample,
        })

        // connecting node to the chain
        this.nodes[this.nodes.length-1].connect(waveShaperNode);
        this.nodes.push(waveShaperNode);
    }

    /**
     * Adds an AudioWorkletNode to the audio processing chain, allowing custom audio processing scripts.
     * @param {string} scriptLocation - The URL or path to the AudioWorkletProcessor script.
     * @param {string} processorName - The name of the processor defined in the script.
     */
    async addProcessingScript(scriptLocation, processorName){
        try {
            await this.audioCtx.audioWorklet.addModule(
                scriptLocation
            );
            console.log("### node added");
        } catch (e) {
            console.log("###", { e });
            throw e;
        }
        try {
            const audioWorkletNode = new AudioWorkletNode(
                this.audioCtx,
                processorName
            );

            // connecting node to the chain
            this.nodes[this.nodes.length-1].connect(audioWorkletNode);
            this.nodes.push(audioWorkletNode);
        } catch(e){
            console.log("###", { e });
            throw e;
        }
    }
    
    /**
     * Connects the last node in the chain to the destination, combines audio and video tracks, and returns the processed MediaStream.
     * @returns {MediaStream} The processed audio and video stream.
     */
    getProcessedStream() {

        // connecting destination at the end of the chain
        this.nodes[this.nodes.length-1].connect(this.destination);

        const processedStream = new MediaStream();

        // separating audio and video tracks
        this.destination.stream.getAudioTracks().forEach((track) => {
            processedStream.addTrack(track);
        });
        this.originalStream.getVideoTracks().forEach((track) => {
            processedStream.addTrack(track);
        });
        return processedStream;
    }

    /**
     * Applies a preset configuration of audio nodes to the processing chain.
     * EXAMPLES - set accordingly
     */
    addPreset1() {
        console.log("PRESET - 1");
        this.addGainNode(1.5);
        this.addBiquadFilterNode('highpass', 1000, 1);
        this.addDelayNode(0.3,1);
    }

    async addPreset2() {
        console.log("PRESET - 2");
        this.addGainNode(0.7);
        this.addBiquadFilterNode('lowpass', 500, 1);
    }

    addPreset3() {
        console.log("PRESET - 3");
        this.addDynamicCompressorNode(-30, 20, 5, 0.1, 0.3);
        this.addDelayNode(0.5,1);
        this.addGainNode(1.2);
    }

    addPreset4() {
        console.log("PRESET - 4");
        const curve = new Float32Array(44100); // Assuming a curve is provided
        this.addWaveShaperNode(curve, '4x');
        this.addBiquadFilterNode('bandpass', 1000, 1);
        this.addGainNode(1.0);
    }

    addPreset5() {
        console.log("PRESET - 5");
        this.addGainNode(1.3);
        this.addBiquadFilterNode('notch', 1200, 1);
        this.addGainNode(0.4);
    }
}

export default MyClass1;

// const audioProcessor = new MyClass1(stream);
// audioProcessor.addGainNode(0.5);
// audioProcessor.addBiquadFilterNode('highpass', 1000, 1);
// const processedStream = audioProcessor.getProcessedStream();
// console.log(processedStream);