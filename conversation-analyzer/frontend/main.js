const recordButton = document.getElementById('record-button');

let isRecording = false;
let mediaRecorder;
let recordedChunks = [];

recordButton.addEventListener('click', async () => {
    if (!isRecording) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });

            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");

            fetch("/upload", {
                method: "POST",
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    console.log("File uploaded successfully");
                } else {
                    console.error("File upload failed");
                }
            })
            .catch(error => {
                console.error("Error uploading file:", error);
            });

            recordedChunks = [];
        };

        mediaRecorder.start();
        recordButton.textContent = 'Stop';
        isRecording = true;
    } else {
        mediaRecorder.stop();
        recordButton.textContent = 'Record';
        isRecording = false;
    }
});
