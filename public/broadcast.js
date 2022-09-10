const peerConnections = {};
const config = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302",
        },
        // {
        //   "urls": "turn:TURN_IP?transport=tcp",
        //   "username": "TURN_USERNAME",
        //   "credential": "TURN_CREDENTIALS"
        // }
    ],
};

const socket = io.connect(window.location.origin);

socket.on("answer", (id, description) => {
    peerConnections[id].setRemoteDescription(description);
});

socket.on("watcher", (id) => {
    const peerConnection = new RTCPeerConnection(config);
    peerConnections[id] = peerConnection;

    // let stream = videoElement.srcObject;
    const stream = sceneElement.captureStream(25);
    stream
        .getTracks()
        .forEach((track) => peerConnection.addTrack(track, stream));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", id, event.candidate);
        }
    };

    peerConnection
        .createOffer()
        .then((sdp) => peerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit("offer", id, peerConnection.localDescription);
        });
});

socket.on("candidate", (id, candidate) => {
    peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("disconnectPeer", (id) => {
    peerConnections[id].close();
    delete peerConnections[id];
});

window.onunload = window.onbeforeunload = () => {
    socket.close();
};

let scene = 0;
// Get camera and microphone
const videoElement = document.querySelector("video");
const videoElem = document.querySelector("#video1");
const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");
const sceneElement = document.querySelector("#scene");
const boardElement = document.querySelector("#board");
const sctx = sceneElement.getContext("2d");
const bctx = boardElement.getContext("2d");
const backgroundElement = document.querySelector("#imgupload");
let bg = 0;
let img = new Image();
let tool = 0;
var flag = false,
    prevX = 0,
    currX = 0,
    prevY = 0,
    currY = 0,
    w,
    h,
    dot_flag = false;

var x = "black",
    y = 2;

var displayMediaOptions = {
    video: {
        cursor: "always",
        height: 720,
        width: 1280,
    },
    audio: false,
};

async function startCapture() {
    try {
        videoElem.srcObject = await navigator.mediaDevices.getDisplayMedia(
            displayMediaOptions
        );
        bg = 2;
    } catch (err) {
        console.error("Error: " + err);
    }
}
function stopCapture(evt) {
	try {
		let tracks = videoElem.srcObject.getTracks();
		tracks.forEach((track) => track.stop());
		videoElem.srcObject = null;
	} catch (error) {
		
	}
}

audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

getStream().then(getDevices).then(gotDevices);

function getDevices() {
    return navigator.mediaDevices.enumerateDevices();
}

function gotDevices(deviceInfos) {
    window.deviceInfos = deviceInfos;
    for (const deviceInfo of deviceInfos) {
        const option = document.createElement("option");
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === "audioinput") {
            option.text =
                deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        } else if (deviceInfo.kind === "videoinput") {
            option.text =
                deviceInfo.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        }
    }
}

function getStream() {
    if (window.stream) {
        window.stream.getTracks().forEach((track) => {
            track.stop();
        });
    }
    const audioSource = audioSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
        audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
        video: { deviceId: videoSource ? { exact: videoSource } : undefined },
    };
    return navigator.mediaDevices
        .getUserMedia(constraints)
        .then(gotStream)
        .catch(handleError);
}

function gotStream(stream) {
    window.stream = stream;
    audioSelect.selectedIndex = [...audioSelect.options].findIndex(
        (option) => option.text === stream.getAudioTracks()[0].label
    );
    videoSelect.selectedIndex = [...videoSelect.options].findIndex(
        (option) => option.text === stream.getVideoTracks()[0].label
    );
    videoElement.srcObject = stream;
    socket.emit("broadcaster");
}

function handleError(error) {
    console.error("Error: ", error);
}

const init = () => {
    (function loop() {
		sctx.fillStyle = "white";
		sctx.fillRect(0, 0, boardElement.width, boardElement.height);
        if (bg == 1) {
            sctx.drawImage(img, 0, 0);
        }
        if (bg == 2) {
            sctx.drawImage(videoElem, 0, 0);
        }
        if (scene == 0) {
            sctx.drawImage(boardElement, 0, 0);
            sctx.drawImage(
                videoElement,
                (videoElement.videoWidth - 720) / 2,
                0,
                720,
                720,
                1080,
                520,
                200,
                200
            );
        }
        if (scene == 1) {
            sctx.fillStyle = "black";
            sctx.fillRect(0, 0, boardElement.width, boardElement.height);
            sctx.drawImage(
                videoElement,
                (1280 - videoElement.videoWidth) / 2,
                0,
                videoElement.videoWidth,
                720
            );
        }
        if (scene == 2) {
            sctx.drawImage(boardElement, 0, 0);
        }
        setTimeout(loop, 1000 / 25);
    })();
    w = boardElement.width;
    h = boardElement.height;

    boardElement.addEventListener(
        "mousemove",
        function (e) {
            findxy("move", e);
        },
        false
    );
    boardElement.addEventListener(
        "mousedown",
        function (e) {
            findxy("down", e);
        },
        false
    );
    boardElement.addEventListener(
        "mouseup",
        function (e) {
            findxy("up", e);
        },
        false
    );
    boardElement.addEventListener(
        "mouseout",
        function (e) {
            findxy("out", e);
        },
        false
    );
    backgroundElement.addEventListener("change", (e) => {
		if(e.target.files[0]){
			stopCapture();
			img.src = URL.createObjectURL(e.target.files[0]);
			bg = 1;
			e.target.value = ""
		}
    });

    setTimeout(() => {
        const scenes = document.querySelector("#sceneLayout");
        scenes.addEventListener("change", () => {
            scene = scenes.value;
            sctx.fillStyle = "white";
            sctx.fillRect(0, 0, boardElement.width, boardElement.height);
        });
        const tools = [...document.querySelectorAll(".tool")];
        tools.forEach((e) => {
            e.addEventListener("click", () => {
                if (!["3", "4", "5"].includes(e.dataset.tool)) {
                    tool = e.dataset.tool;
                } else {
                    if (e.dataset.tool == 3) {
                        erase();
                    }
                }
            });
        });
        const bgs = [...document.querySelectorAll(".bg")];
        bgs.forEach((e) => {
            e.addEventListener("click", () => {
                if (e.dataset.bg == 0) {
                    stopCapture();
                    bg = 0;
                }
                if (e.dataset.bg == 1) {
                    backgroundElement.click();
                }
                if (e.dataset.bg == 2) {
                    startCapture();
                }
            });
        });
    }, 500);
};

function color(obj) {
    switch (obj.id) {
        case "green":
            x = "green";
            break;
        case "blue":
            x = "blue";
            break;
        case "red":
            x = "red";
            break;
        case "yellow":
            x = "yellow";
            break;
        case "orange":
            x = "orange";
            break;
        case "black":
            x = "black";
            break;
        case "white":
            x = "white";
            break;
    }
    if (x == "white") y = 14;
    else y = 2;
}

function draw(e) {
    if (tool == 1) {
        bctx.globalCompositeOperation = "source-over";
        bctx.beginPath();
        bctx.moveTo(prevX, prevY);
        bctx.lineTo(currX, currY);
        bctx.strokeStyle = x;
        bctx.lineWidth = y;
        bctx.stroke();
        bctx.closePath();
    }
    if (tool == 2) {
        bctx.globalCompositeOperation = "destination-out";
        bctx.beginPath();
        bctx.moveTo(prevX, prevY);
        bctx.lineTo(currX, currY);
        bctx.strokeStyle = "#FFFFFF";
        bctx.lineWidth = 20;
        bctx.stroke();
        bctx.closePath();
    }
}

function erase() {
    var m = confirm("Want to clear");
    if (m) {
        bctx.clearRect(0, 0, w, h);
    }
}

function findxy(res, e) {
    var rect = boardElement.getBoundingClientRect();
    if (res == "down") {
        prevX = currX;
        prevY = currY;
        currX = e.clientX - rect.left;
        currY = e.clientY - rect.top;

        flag = true;
        dot_flag = true;
        if (dot_flag) {
            if (tool == 1) {
                bctx.beginPath();
                bctx.fillStyle = x;
                bctx.fillRect(currX, currY, 2, 2);
                bctx.closePath();
                dot_flag = false;
            }
            if (tool == 2) {
                dot_flag = false;
            }
        }
    }
    if (res == "up" || res == "out") {
        flag = false;
    }
    if (res == "move") {
        if (flag) {
            prevX = currX;
            prevY = currY;
            currX = e.clientX - rect.left;
            currY = e.clientY - rect.top;
            draw(e);
        }
    }
}
init();
