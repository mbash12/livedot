const express = require("express");
const app = express();

let broadcaster;
let watchers = [];
const port = 4000;

const http = require("http");
const server = http.createServer(app);

const io = require("socket.io")(server);
app.use(express.static(__dirname + "/public"));

io.sockets.on("error", (e) => console.log(e));
io.sockets.on("connection", (socket) => {
  socket.on("broadcaster", () => {
    broadcaster = socket.id;
    socket.broadcast.emit("broadcaster");
  });
  socket.on("watcher", (username) => {
    if(username != undefined){
      watchers.push({ id: socket.id, username: username });
      socket.to(broadcaster).emit("watcher", socket.id);
      socket.to(broadcaster).emit("watchers", watchers);
    }
  });
  socket.on("offer", (id, message) => {
    socket.to(id).emit("offer", socket.id, message);
  });
  socket.on("answer", (id, message) => {
    socket.to(id).emit("answer", socket.id, message);
  });
  socket.on("candidate", (id, message) => {
    socket.to(id).emit("candidate", socket.id, message);
  });
  socket.on("disconnect", () => {
    watchers = watchers.filter((e) => e.id != socket.id);
    socket.to(broadcaster).emit("disconnectPeer", socket.id);
    socket.to(broadcaster).emit("watchers", watchers);
  });
  socket.on('chat', msg => {
    io.emit('chat', msg);
  });
});
server.listen(port, () => console.log(`Server is running on port ${port}`));
