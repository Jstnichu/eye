document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('webcam');
    const openBtn = document.getElementById('openBtn');
    const closeBtn = document.getElementById('closeBtn');
    const laptopSizeInput = document.getElementById('laptopSize');
    const personInfoElement = document.getElementById('personInfo');
    const distanceInfoElement = document.getElementById('distanceInfo');
    const alertElement = document.getElementById('alert');
    let stream;
    let model;

    // Known size for estimating distance (person's height in inches)
    const knownSize = 72;

    // Load the COCO-SSD model
    async function loadModel() {
        try {
            model = await cocoSsd.load();
        } catch (error) {
            console.error('Error loading the COCO-SSD model:', error);
        }
    }

    // Function to detect and highlight a person in the video
    async function detectPerson() {
        if (!model) {
            console.warn('Model not loaded yet. Waiting for model to load.');
            setTimeout(detectPerson, 1000); // Retry after 1 second
            return;
        }

        const predictions = await model.detect(video);

        // Check if a person is detected
        const person = predictions.find(prediction => prediction.class === 'person');

        if (person) {
            const confidence = person.score;
            const infoText = `Person Detected with confidence: ${confidence}`;
            personInfoElement.textContent = infoText;

            // Display the estimated distance and check against the recommended safe distance
            const estimatedDistance = estimateDistance(person.bbox[2]); // Pass the width of the bounding box
            displayDistanceInfo(estimatedDistance);

            // Compare with the safe distance and show an alert if it's less
            const safeDistance = calculateSafeDistance();
            if (estimatedDistance < safeDistance) {
                alertElement.textContent = 'Alert: You are too close! Maintain a safe distance.';
            } else {
                alertElement.textContent = ''; // Clear the alert if safe distance is maintained
            }
        } else {
            personInfoElement.textContent = ''; // Clear the info if no person is detected
            distanceInfoElement.textContent = ''; // Clear the distance info
            alertElement.textContent = ''; // Clear the alert
        }

        const ctx = video.getContext('2d');

        // Clear previous drawings
        ctx.clearRect(0, 0, video.width, video.height);

        // Draw bounding boxes for detected persons
        predictions.forEach(prediction => {
            ctx.beginPath();
            ctx.rect(
                prediction.bbox[0],
                prediction.bbox[1],
                prediction.bbox[2],
                prediction.bbox[3]
            );
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.fillStyle = 'red';
            ctx.stroke();
            ctx.fillText(
                `${prediction.class} ${Math.round(prediction.score * 100)}%`,
                prediction.bbox[0],
                prediction.bbox[1] > 10 ? prediction.bbox[1] - 5 : 10
            );
        });

        // Continue detection for the next frame
        requestAnimationFrame(detectPerson);
    }

    // Function to open the camera
    async function openCamera() {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        // Load the COCO-SSD model if not already loaded
        if (!model) {
            await loadModel();
        }

        detectPerson(); // Start person detection
    }

    // Function to close the camera
    function closeCamera() {
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;

            // Clear the person detection info, distance info, and alert on closing
            personInfoElement.textContent = '';
            distanceInfoElement.textContent = '';
            alertElement.textContent = '';
        }
    }

    // Function to estimate distance based on known size and apparent size in the image
    function estimateDistance(apparentSize) {
        const focalLength = (apparentSize * knownSize) / laptopSizeInput.value;
        return focalLength;
    }

    // Function to display the estimated distance
    function displayDistanceInfo(estimatedDistance) {
        const distanceInfoText = `Estimated Distance: ${Math.round(estimatedDistance)} inches`;
        distanceInfoElement.textContent = distanceInfoText;
    }

    // Function to calculate and return the recommended safe distance
    function calculateSafeDistance() {
        const laptopSize = parseFloat(laptopSizeInput.value) || 0;

        if (laptopSize > 0) {
            return Math.round((laptopSize * 0.75) / Math.tan(30 * (Math.PI / 180))); // Angle of view assumed as 60 degrees
        } else {
            return 0;
        }
    }

    // Add event listeners to open and close buttons
    openBtn.addEventListener('click', openCamera);
    closeBtn.addEventListener('click', closeCamera);
});
