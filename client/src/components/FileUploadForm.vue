<template>
    <div class="form-container">
        <form class="dropzone-box">
            <h2>Upload and attach video files</h2>
            <p>Click to upload or drag and drop</p>
            <div class="dropzone-area" ref="dropzoneArea" @dragover.prevent="dragOver" @dragleave="dragLeave"
                @dragend="dragLeave" @drop.prevent="drop">
                <div class="file-upload-icon">
                </div>
                <input type="file" id="upload-file" name="uploaded-file" @change="fileChanged" />
                <p class="file-info" :class="fileRequired ? 'error' : 'text-gray'">{{ fileInfo }}</p>
            </div>
            <div v-if="!filesReady" class="dropzone-actions">
                <button type="reset">Cancel</button>
                <button v-if="submitted" id="submit-button" type="submit" disabled>Loading...</button>
                <button v-else id="submit-button" type="submit" @click.prevent="submitForm">Process</button>
            </div>
            <div v-else style="display: flex; gap: 12px;" class="dropzone-actions">
                <button class="submit-button" @click.prevent="downloadSRTFile">Download SRT</button>
                <button class="submit-button" @click.prevent="downloadTranscriptFile">Download Transcript</button>
                <button class="submit-button" @click.prevent="downloadVTTFile">Download VTT</button>
            </div>
        </form>
    </div>
</template>

<script setup>
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { ref } from 'vue';
import { uploadAudio, sendToAudioTextWorker, createSRTFile, createTranscriptFile, createVTTFile } from '../utils.js';


const ffmpeg = new FFmpeg();
const selectedFile = ref(null);
const fileInfo = ref("No Files Selected");
const dropzoneArea = ref(null);
const fileRequired = ref(false);
const submitted = ref(false);
const filesReady = ref(false);
const readyTranscriptFile = ref();
const readySRTFile = ref(null);
const readyVTTFile = ref(null);
const transcriptBlob = ref(null)
const vttBlob = ref(null)
const srtBlob = ref(null)


function fileChanged(e) {
    if (e.target.files.length) {
        selectedFile.value = e.target.files[0];
        updateDropzoneFileList(selectedFile.value);
    }
}

function updateDropzoneFileList(file) {
    fileInfo.value = `${file.name}, ${file.size} bytes`;
}

function dragOver() {
    dropzoneArea.value.classList.add('dropzone--over');
}

function dragLeave() {
    dropzoneArea.value.classList.remove('dropzone--over');
}

function drop(e) {
    if (e.dataTransfer.files.length) {
        selectedFile.value = e.dataTransfer.files[0];
        updateDropzoneFileList(selectedFile.value);
    }
    dropzoneArea.value.classList.remove('dropzone--over');
}

async function submitForm() {
    // main shit
    if (!selectedFile.value) {
        fileRequired.value = true;
        return;
    }
    submitted.value = true;
    console.log(selectedFile.value)
    console.log("Loading ffmpeg wasm...");
    ffmpeg.on('log', ({ message: msg }) => {
        console.log(msg);
    })
    await ffmpeg.load({
        coreURL: await toBlobURL(`/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`/ffmpeg-core.worker.js`, 'text/javascript')
    })
    console.log("Writing video file")
    const videoFileBlobURL = URL.createObjectURL(selectedFile.value)
    await ffmpeg.writeFile(selectedFile.value.name, await fetchFile(videoFileBlobURL));
    console.log("executing command...")
    await ffmpeg.exec(['-i', selectedFile.value.name, '-vn', '-acodec', 'libmp3lame', 'out.mp3']);
    console.log('writing output audio')
    const outputAudio = await ffmpeg.readFile('out.mp3');
    console.log("done writing file")
    // upload audio to cloud and get url
    const url = await uploadAudio(new Blob([outputAudio.buffer], { type: 'audio/mpeg' }))
    // send url to audio to text worker ai
    const audioTextResponse = await sendToAudioTextWorker(url);
    // if target language not equal to source language, send to translation worker ai (coming soon)

    // prepare transcript file
    transcriptBlob = createTranscriptFile(audioTextResponse);
    // prepare VTT file
    vttBlob.value = createVTTFile(audioTextResponse);
    // convert text to srt file
    srtBlob.value = createSRTFile(audioTextResponse);

    filesReady.value = true;
}

function downloadSRTFile() {
    const downloadURL = URL.createObjectURL(srtBlob.value);
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadURL;
    downloadLink.download = `Subtitled_${selectedFile.value.name.split('.')[0]}.srt`;
    downloadLink.click();
}

function downloadVTTFile() {
    const downloadURL = URL.createObjectURL(vttBlob.value);
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadURL;
    downloadLink.download = `Subtitled_${selectedFile.value.name.split('.')[0]}.vtt`;
    downloadLink.click();
}

function downloadTranscriptFile() {
    const downloadURL = URL.createObjectURL(transcriptBlob.value);
    const downloadLink = document.createElement('a')
    downloadLink.href = downloadURL;
    downloadLink.download = `Subtitled_${selectedFile.value.name.split('.')[0]}.txt`;
    downloadLink.click();
}
</script>

<style scoped>
* {
    box-sizing: border-box;
    padding: 0;
    margin: 0;
}

.error {
    color: var(--error);
}


.form-container {
    font-family: 'Work Sans', sans-serif;
    background: var(--bg);
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80vh;
    padding: 1rem;
    color: var(--text);
}

*::selection {
    background: var(--primary);
    color: var(--btn-text);
}

.dropzone-box {
    border-radius: 1rem;
    padding: 2rem;
    display: flex;
    justify-content: center;
    flex-direction: column;
    max-width: 36rem;
    border: 1px solid var(--border);
    width: 100%;
    background: var(--dropzone-bg);
}

.dropzone-box h2 {
    font-size: 1.4rem;
    margin-bottom: 0.6rem;
    color: var(--headline);
}

.dropzone-box p {
    font-size: 1.15rem;
}

.text-gray {
    color: var(--gray);
}

.dropzone-area {
    padding: 1rem;
    position: relative;
    margin-top: 1.5rem;
    min-height: 16rem;
    display: flex;
    text-align: center;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    border: 2px dashed var(--dropzone-border);
    border-radius: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.dropzone-area .file-info {
    font-size: 1.1rem;
}

.dropzone-area [type="file"] {
    cursor: pointer;
    position: absolute;
    opacity: 0;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
}

.dropzone-area .file-upload-icon svg {
    height: 6rem;
    max-width: 6rem;
    width: 100%;
    margin-bottom: 0.5rem;
    stroke: var(--headline);
}

.dropzone-area:hover {
    background: var(--dropzone-over);
}

.dropzone--over {
    border: 2px solid var(--primary);
    background: var(--dropzone-over);
}

.dropzone-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 2rem;
    gap: 1rem;
    flex-wrap: wrap;
}

.dropzone-actions button {
    flex-grow: 1;
    min-height: 3rem;
    font-size: 1.2rem;
    border: none;
    transition: background 0.3s ease;
}


.dropzone-actions button[type='reset'] {
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    color: var(--text);
    background: var(--secondary);
    cursor: pointer;
    border: 1px solid var(--border);
}

.dropzone-actions button[type='reset']:hover {
    background: var(--secondary-hover);
}

.dropzone-actions button[type='submit'] {
    background: var(--primary);
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    color: var(--primary-text);
    border: none;
    cursor: pointer;
}

.dropzone-actions button[type='submit']:hover {
    background: var(--primary-hover);
}

.submit-button {
    border-radius: 0.5rem;
    padding: 5px;
}
</style>