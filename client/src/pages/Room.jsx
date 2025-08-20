import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import YouTube from 'react-youtube';
import { Video, Users, Copy, Check, LogOut, Play, Pause, ExternalLink, Send, MessageCircle } from 'lucide-react';

const socket = io("https://letuswatch.onrender.com", {
  transports: ["websocket"],
});

export default function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const { username } = location.state || '';

  const [users, setUsers] = useState([]);
  const [admin, setAdmin] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const playerRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);



  // Addint Toasts 
  const addToast = (message, type = 'info') => {
    const id = ++toastIdRef.current;
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };
  
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  

  const onReady = ((event) => {
    playerRef.current = event.target;
  });

  // Handle YouTube player state changes (when user clicks on video controls)

  const onStateChange = (event) => {
    const playerState = event.data;
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;

    // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (playerState === 1 && !isPlaying) { // Playing
      setIsPlaying(true);
      socket.emit('play-video', { roomId, username, time: currentTime });
    } else if (playerState === 2 && isPlaying) { // Paused
      setIsPlaying(false);
      socket.emit('pause-video', { roomId, username, time: currentTime });
    }
  };

  useEffect(() => {
    if(!playerRef.current) return;
    if(isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  const togglePlayPause = () => {
    if(!playerRef.current) return;

    const newState = !isPlaying;
    setIsPlaying(newState);

    const currentTime = playerRef.current.getCurrentTime();

    socket.emit(newState ? 'play-video' : 'pause-video', { roomId, username, time : currentTime });
  };

  useEffect(() => {
    // Join the room
    if (!roomId || !username) return;
    socket.emit("join-room", { roomId, username });
  
    // Handle room updates
    const handleRoomUpdate = ({ users, admin }) => {
      setUsers(users);
      setAdmin(admin);
    };
  
    socket.on("room-update", handleRoomUpdate);
  
    // Handle new messages
    const handleNewMessage = ({ username, message }) => {
      addMessageToChat(`${username}: ${message}`);
    };
  
    socket.on("new-message", handleNewMessage);

    // Handle play/pause events
    const handlePlayVideo = ({ username: eventUsername, time }) => {
      // Only sync if the event is from another user
      if (eventUsername !== username) {
        setIsPlaying(true);
        if (playerRef.current) {
          playerRef.current.seekTo(time, true);
          playerRef.current.playVideo();
        }
      }
      addMessageToChat(`${eventUsername} started playing the video.`);
    };
    
    const handlePauseVideo = ({ username: eventUsername, time }) => {
      // Only sync if the event is from another user
      if (eventUsername !== username) {
        setIsPlaying(false);
        if (playerRef.current) {
          playerRef.current.seekTo(time, true);
          playerRef.current.pauseVideo();
        }
      }
      addMessageToChat(`${eventUsername} paused the video.`);
    };
    
    socket.on("play-video", handlePlayVideo);
    socket.on("pause-video", handlePauseVideo);

    // Handle video loading - this is the key fix for video sync
    const handleVideoLoaded = ({ videoId, username: eventUsername }) => {
      setCurrentVideo({
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&controls=1&disablekb=1`,
        title: `Video ${videoId}`,
        loadedBy: eventUsername,
        loadedAt: new Date().toLocaleTimeString(),
      });
      
      // Reset playing state when new video loads
      setIsPlaying(false);
      
      // Add message to chat
      if (eventUsername !== username) {
        addMessageToChat(`${eventUsername} loaded a new video.`);
      }
    };

    socket.on("video-loaded", handleVideoLoaded);
  
    // Cleanup listeners on unmount
    return () => {
      socket.off("room-update", handleRoomUpdate);
      socket.off("new-message", handleNewMessage);
      socket.off("play-video", handlePlayVideo);
      socket.off("pause-video", handlePauseVideo);
      socket.off("video-loaded", handleVideoLoaded);
    };
  }, [roomId, username]);
  
  const addMessageToChat = (message) => {
    setMessages((prevMessages) => [...prevMessages, message].slice(-200)); // Limit to 200 messages
  };

  const sendMessage = () => {
    if (newMessage.trim().length > 200) {
      alert('Message cannot exceed 200 characters.');
      return;
    }

    socket.emit('new-message', { roomId, username, message: newMessage });
    setNewMessage('');
  };

  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const loadVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL!');
      return;
    }

    // Set current video locally first
    setCurrentVideo({
      id: videoId,
      url: videoUrl,
      embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&controls=1&disablekb=1`,
      title: `Video ${videoId}`,
      loadedBy: username,
      loadedAt: new Date().toLocaleTimeString(),
    });

    // Reset playing state
    setIsPlaying(false);

    // Emit to other users
    socket.emit('video-loaded', { roomId, videoId, username });
    
    // Clear the input
    setVideoUrl('');
    
    // Add message to local chat
    addMessageToChat(`You loaded a new video.`);
  };

  const handleLeave = () => {
    socket.emit('leave-room');
    navigate('/');
  };

  const copyData = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };


  const ToastContainer = ({ toasts, removeToast }) => (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
          toast.type === 'success' ? 'bg-green-500/90 border-l-4 border-green-400' :
          toast.type === 'error' ? 'bg-red-500/90 border-l-4 border-red-400' :
          toast.type === 'warning' ? 'bg-yellow-500/90 border-l-4 border-yellow-400' :
          'bg-blue-500/90 border-l-4 border-blue-400'
        }`}
      >
        <div className="flex-shrink-0">
          {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
          {toast.type === 'info' && <Info className="w-5 h-5" />}
        </div>
        <div className="flex-1 text-white text-sm font-medium">
          {toast.message}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
    </div>
    )
    

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 to-red-500 text-white">

      {/* Room Header */}
      <header className="bg-gradient-to-r from-purple-300 via-purple-400 to-purple-900 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between max-w-6xl mx-auto p-4 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-wide flex items-center">
              <img src="/logo.png" alt="logo" className="h-12 w-12 lg:h-[7rem] lg:w-[7rem] rounded-full" />
              <span className="ml-2">Watch Together</span>
            </h1>
            <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full shadow-md">
              <span className="text-purple-200 text-sm">Room:</span>
              <span className="text-white font-mono font-bold">{roomId}</span>
              <button
                onClick={copyData}
                className="text-purple-300 hover:text-purple-200 transition-colors ml-1"
                title="Copy room ID"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-purple-200">
              <Users className="w-5 h-5" />
              <span className="text-sm">{users.length} Online</span>
            </div>
            <button
              onClick={handleLeave}
              className="bg-red-600/20 text-red-300 px-4 py-2 rounded-lg hover:bg-red-600/30 transition-colors flex items-center space-x-2 shadow-md"
            >
              <LogOut className="w-5 h-5" />
              <span>Leave</span>
            </button>
          </div>
        </div>
      </header>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row justify-between mx-auto p-6 max-w-6xl">
        {/* Video Area */}
        <section className="flex-1">
          <div className="bg-black/20 backdrop-blur-lg rounded-xl p-4 lg:p-6 border border-white/10 shadow-lg">
            {currentVideo ? (
              <div className="space-y-6">
                <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-md">
                <YouTube
                  videoId={currentVideo.id}
                  onReady={onReady}
                  onStateChange={onStateChange}
                  className="w-full h-full aspect-video rounded-lg overflow-hidden"
                  opts={{
                    playerVars: { autoplay: 0, controls: 1, disablekb: 1 }
                  }}
                />
                </div>
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
                  <div>
                    <h3 className="text-lg font-semibold">{currentVideo.title || 'Video Title'}</h3>
                    <p className="text-purple-300 text-sm">
                      Loaded by {currentVideo.loadedBy || 'Unknown'} at {currentVideo.loadedAt || 'Unknown time'}
                    </p>
                  </div>
                  <a
                    href={currentVideo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-300 hover:text-purple-200 transition-colors"
                    title="Open on YouTube"
                  >
                    <ExternalLink className="w-6 h-6" />
                  </a>
                </div>
                <div className="flex items-center justify-center space-x-6">
                  <button
                    onClick={togglePlayPause}
                    className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-full shadow-md transition-transform transform hover:scale-110"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>
                  <div className="text-purple-300 text-sm">
                    {isPlaying ? 'Playing' : 'Paused'} • Synced with {users.length} viewer
                    {users.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center mb-6 shadow-md">
                <div className="text-center text-purple-200">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No video loaded</p>
                  <p className="text-sm opacity-75">Share a YouTube URL below to start watching together</p>
                </div>
              </div>
            )}
            <div className="mt-6">
              <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 text-white">
                <input
                  type="text"
                  placeholder="Paste YouTube URL here (e.g., https://youtu.be/dQw4w9WgXcQ)"
                  className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
                />
                <button
                  onClick={loadVideo}
                  disabled={!videoUrl}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load Video
                </button>
              </div>
              <p className="text-purple-300 text-xs mt-2">
                Supports YouTube links in any format (youtube.com/watch, youtu.be, etc.)
              </p>
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="w-full lg:w-80 space-y-6 mt-6 lg:mt-0 lg:ml-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 flex flex-col h-96 shadow-lg">
            <div className="p-4 border-b border-white/20">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat
              </h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
              {messages.length > 0 ? (
                messages.map((message, index) => (
                  <div key={index} className="text-sm">
                    {message}
                  </div>
                ))
              ) : (
                <div className="text-center text-purple-300 text-sm">
                  No messages yet. Start the conversation! 💬
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/20">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 p-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => 
                    e.key === 'Enter' && sendMessage()
                  }
                  maxLength={200}
                />
                <button
                  onClick={sendMessage}
                  className="bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 shadow-lg">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Online ({users.length})
            </h3>
            <ul className="space-y-2">
              {users.map((user, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg hover:bg-purple-500/20 transition-colors"
                >
                  <span className="text-white">{user}</span>
                  {user === admin && (
                    <span className="text-yellow-400 font-semibold">Admin</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Room Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-purple-200">Room ID:</span>
                <span className="text-white font-mono">{roomId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-200">Admin:</span>
                <span className="text-white">{admin || 'No admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-200">Total Users:</span>
                <span className="text-white">{users.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

     
  
    </div>
  );
}