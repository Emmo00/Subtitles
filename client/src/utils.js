export async function uploadAudio(file) {
  const unsignedUploadPreset = import.meta.env.VITE_CLOUDINARY_PRESET;
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUDNAME;
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const fd = new FormData();
  fd.append('upload_preset', unsignedUploadPreset);
  fd.append('tags', 'browser_upload'); // Optional - add tags for image admin in Cloudinary
  fd.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: fd,
  });
  const responseObject = await response.json();
  return responseObject.secure_url;
}

export async function sendToAudioTextWorker(url) {
  const audioTextWorkerAiURL = import.meta.env.VITE_AUDIO_AI_WORKER_URL;

  const response = await fetch(audioTextWorkerAiURL, {
    method: 'POST',
    body: JSON.stringify({ url }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return await response.json();
}

function convertTimestamp(timestamp) {
  let [time, milliseconds] = timestamp.split('.');
  time = Number(time);
  let seconds = time % 60;
  if (String(seconds).length < 2) seconds = '0' + seconds;
  let minutes = Math.floor(time / 60) % 60 || '00';
  if (String(minutes).length < 2) minutes = '0' + minutes;
  let hours = Math.floor(Math.floor(time / 60) / 60) || '00';
  if (String(hours).length < 2) hours = '0' + hours;

  const stamp = `${hours}:${minutes}:${seconds},${milliseconds}`;
  return stamp;
}

function convertVTTToSRT(vttContent) {
  // Split the VTT content into blocks
  const blocks = vttContent.split('\n\n');

  // Initialize the SRT content
  let srtContent = '';
  let counter = 1;

  blocks.forEach((block) => {
    if (block) {
      // Extract the timestamp and text from the VTT block
      const match = block.match(/(\d+.\d+) --> (\d+.\d+)/);
      if (match) {
        const [_, startTime, endTime] = match;
        // Convert the timestamp format from VTT to SRT
        const startTimeSrt = convertTimestamp(startTime);
        const endTimeSrt = convertTimestamp(endTime);

        // Extract the text from the VTT block
        const text = block.replace(match[0], '').trim();

        // Format the SRT block
        const srtBlock = `${counter}\n${startTimeSrt} --> ${endTimeSrt}\n${text}\n\n`;
        srtContent += srtBlock;
        counter++;
      }
    }
  });

  return srtContent;
}

export function createSRTFile(audioTextResponse) {
  const vttContent = audioTextResponse.data.vtt;
  const srtContent = convertVTTToSRT(vttContent);
  const srtBlob = new Blob([srtContent], { type: 'application/x-subrip' });
  return srtBlob;
}

export function createVTTFile(audioTextResponse) {
  const srtContent = audioTextResponse.data.vtt;
  const srtBlob = new Blob([srtContent], { type: 'text/vtt' });
  return srtBlob;
}

export function createTranscriptFile(audioTextResponse) {
  const srtContent = audioTextResponse.data.text;
  const srtBlob = new Blob([srtContent], { type: 'text/plain' });
  return srtBlob;
}
