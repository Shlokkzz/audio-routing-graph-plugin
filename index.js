class MyClass1 {
    constructor(stream) {
        const AC = (window.AudioContext || window.webkitAudioContext);
        this.audioCtx = new AC();
        this.source = this.audioCtx.createMediaStreamSource(stream);
        this.destination = this.audioCtx.createMediaStreamDestination();
        this.nodes = [];
        this.originalStream = stream;
    }
    // constructor(){
    //     console.log("Hello")
    // }
    addGainNode(gain) {
        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = gain || 1;
        this.nodes.push(gainNode);
    }

    addBiquadFilterNode(type, frequency, Q) {
        const biquadFilterNode = this.audioCtx.createBiquadFilter();
        biquadFilterNode.type = type || 'lowpass';
        biquadFilterNode.frequency.value = frequency || 350;
        biquadFilterNode.Q.value = Q || 1;
        this.nodes.push(biquadFilterNode);
    }

    addDynamicCompressorNode(threshold, knee, ratio, attack, release) {
        const compressorNode = this.audioCtx.createDynamicsCompressor();
        compressorNode.threshold.setValueAtTime(threshold || -50, this.audioCtx.currentTime);
        compressorNode.knee.setValueAtTime(knee || 40, this.audioCtx.currentTime);
        compressorNode.ratio.setValueAtTime(ratio || 12, this.audioCtx.currentTime);
        compressorNode.attack.setValueAtTime(attack || 0, this.audioCtx.currentTime);
        compressorNode.release.setValueAtTime(release || 0.25, this.audioCtx.currentTime);
        this.nodes.push(compressorNode);
    }

    getProcessedStream() {
        this.handleChanges();
        const processedStream = new MediaStream();
        this.destination.stream.getAudioTracks().forEach((track) => {
            processedStream.addTrack(track);
        });
        this.originalStream.getVideoTracks().forEach((track) => {
            processedStream.addTrack(track);
        });
        return processedStream;
    }

    handleChanges() {
        let previousNode = this.source;
        this.nodes.forEach(node => {
            previousNode.connect(node);
            previousNode = node;
        });
        previousNode.connect(this.destination);
    }

    addPreset1() {
        console.log("PRESET - 1");
    }

    addPreset2() {
        console.log("PRESET - 2");
    }

    addPreset3() {
        console.log("PRESET - 3");
    }

    addPreset4() {
        console.log("PRESET - 4");
    }

    addPreset5() {
        console.log("PRESET - 5");
    }
}

export default MyClass1;

// const audioProcessor = new MyClass1(stream);
// audioProcessor.addGainNode(0.5);
// audioProcessor.addBiquadFilterNode('highpass', 1000, 1);
// const processedStream = audioProcessor.getProcessedStream();
// console.log(processedStream);