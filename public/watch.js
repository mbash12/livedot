let peerConnection;
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
let username = "";
const socket = io.connect(window.location.origin);
const video = document.querySelector("video");
const enableAudioButton = document.querySelector("#enable-audio");

enableAudioButton.addEventListener("click", enableAudio);

socket.on("offer", (id, description) => {
  peerConnection = new RTCPeerConnection(config);
  peerConnection
    .setRemoteDescription(description)
    .then(() => peerConnection.createAnswer())
    .then((sdp) => peerConnection.setLocalDescription(sdp))
    .then(() => {
      socket.emit("answer", id, peerConnection.localDescription);
    });
  peerConnection.ontrack = (event) => {
    video.srcObject = event.streams[0];
  };
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", id, event.candidate);
    }
  };
});

socket.on("candidate", (id, candidate) => {
  peerConnection
    .addIceCandidate(new RTCIceCandidate(candidate))
    .catch((e) => console.error(e));
});

// socket.on("connect", () => {
//   socket.emit("watcher","itsme");
// });

socket.on("chat", function (msg) {
  msg = JSON.parse(msg)
  console.log(msg)
  let chat = document.querySelector("#messages");
  var item = document.createElement("div");
  item.className = "w-full pt-6";
  item.innerHTML = `
    <div class="text-white mb-2 text-sm opacity-60 ${msg.username}">
    ${msg.username}
    </div>
    <div
    class="p-2 bg-gray-700 text-white rounded-xl rounded-tl-none flex flex-col max-w-9/10"
    >
    ${msg.message}
    <span class="text-sm text-gray-400 block ml-auto mt-1"
        >${msg.time}</span
    >
    </div>
  `;
  chat.appendChild(item);
  let mw = document.querySelector("#messages-wrapper");
  mw.scrollTop = mw.scrollHeight;
});

socket.on("broadcaster", () => {
  socket.emit("watcher");
});

window.onunload = window.onbeforeunload = () => {
  socket.close();
  peerConnection.close();
};

document.querySelector("#message").addEventListener("submit", (e) => {
  e.preventDefault();
  let t = document.querySelector("#msgtext");
  socket.emit(
    "chat",
    JSON.stringify({ username: username, message: t.value, time: new Date() })
  );
  t.value = "";
});

document.querySelector("#enter").addEventListener("submit", (e) => {
  e.preventDefault();
  let u = document.querySelector("#username").value;
  username = u;
  socket.emit("watcher", u);
  enableAudio();
  document.querySelector("#login").style.display = "none";
});

function enableAudio() {
  video.muted = false;
}
