class MyClass1 {
    constructor(stream) {
        this.nodes = [];
        const AC = (window.AudioContext || window.webkitAudioContext);
        this.audioCtx = new AC();
        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.destination = this.audioCtx.createMediaStreamDestination();
        this.originalStream = stream;
        this.nodes.push(this.source);
    }
    
    addGainNode(gain) {
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = gain || 1;
        this.nodes[this.nodes.length-1].connect(gainNode);
        this.nodes.push(gainNode);

    }

    addBiquadFilterNode(type, frequency, Q) {
        const biquadFilterNode = this.audioCtx.createBiquadFilter();
        biquadFilterNode.type = type || 'lowpass';
        biquadFilterNode.frequency.value = frequency || 350;
        biquadFilterNode.Q.value = Q || 1;
        this.nodes[this.nodes.length-1].connect(biquadFilterNode);
        this.nodes.push(biquadFilterNode);
    }

    addDynamicCompressorNode(threshold, knee, ratio, attack, release) {
        const compressorNode = this.audioCtx.createDynamicsCompressor();
        compressorNode.threshold.setValueAtTime(threshold || -50, this.audioCtx.currentTime);
        compressorNode.knee.setValueAtTime(knee || 40, this.audioCtx.currentTime);
        compressorNode.ratio.setValueAtTime(ratio || 12, this.audioCtx.currentTime);
        compressorNode.attack.setValueAtTime(attack || 0, this.audioCtx.currentTime);
        compressorNode.release.setValueAtTime(release || 0.25, this.audioCtx.currentTime);
        this.nodes[this.nodes.length-1].connect(compressorNode);
        this.nodes.push(compressorNode);
    }

    addDelayNode(delayTime,maxDelayTime){
        const delayNode = new DelayNode(this.audioCtx, {
            delayTime: delayTime,
            maxDelayTime: maxDelayTime,
          });
        this.nodes[this.nodes.length-1].connect(delayNode);
        this.nodes.push(delayNode);
    }

    // buffer "path/to/impulse-response.wav"
    // normalize boolean 
    async addConvolverNode(buffer,normalize){
        const convolverNode = this.audioCtx.createConvolver();
        let response = await fetch(buffer);
        let arraybuffer = await response.arrayBuffer();
        convolverNode.buffer = await this.audioCtx.decodeAudioData(arraybuffer);
        convolverNode.normalize=normalize;

        this.nodes[this.nodes.length-1].connect(convolverNode);
        this.nodes.push(convolverNode);
    }   

    addWaveShaperNode(curve, oversample){
        const waveShaperNode = new WaveShaperNode(this.audioCtx, {
            curve: curve,
            oversample: oversample,
        })

        this.nodes[this.nodes.length-1].connect(waveShaperNode);
        this.nodes.push(waveShaperNode);
    }

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
            this.nodes[this.nodes.length-1].connect(audioWorkletNode);
            this.nodes.push(audioWorkletNode);
        } catch(e){
            console.log("###", { e });
            throw e;
        }
    }
    
    getProcessedStream() {
        this.nodes[this.nodes.length-1].connect(this.destination);
        const processedStream = new MediaStream();
        this.destination.stream.getAudioTracks().forEach((track) => {
            processedStream.addTrack(track);
        });
        this.originalStream.getVideoTracks().forEach((track) => {
            processedStream.addTrack(track);
        });
        return processedStream;
    }


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