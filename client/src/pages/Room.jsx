import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import YouTube from 'react-youtube';
import { Video, Users, Copy, Check, LogOut, Play, Pause, ExternalLink, Send, MessageCircle } from 'lucide-react';
import socket from '../socket';




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

  const chatContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  


  // // Addint Toasts 
  // const addToast = (message, type = 'info') => {
  //   const id = ++toastIdRef.current;
  //   const newToast = { id, message, type };
  //   setToasts(prev => [...prev, newToast]);
    
  //   // Auto-remove toast after 4 seconds
  //   setTimeout(() => {
  //     removeToast(id);
  //   }, 4000);
  // };
  
  // const removeToast = (id) => {
  //   setToasts(prev => prev.filter(toast => toast.id !== id));
  // };
  
  // YouTube player options
  const onStateChange = (event) => {
    // Add safety check for player reference
    if (!playerRef.current) return;
    
    try {
      const playerState = event.data;
      const currentTime = playerRef.current.getCurrentTime();
  
      // YouTube player states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
      if (playerState === 1 && !isPlaying) { // Playing
        setIsPlaying(true);
        socket.emit('play-video', { roomId, username, time: currentTime });
      } else if (playerState === 2 && isPlaying) { // Paused
        setIsPlaying(false);
        socket.emit('pause-video', { roomId, username, time: currentTime });
      }
    } catch (error) {
      console.warn('YouTube player state change error (likely due to player cleanup):', error);
      // Don't throw - this is expected when player is being replaced
    }
  };
  
  const onReady = (event) => {
    console.log('YouTube player ready');
    playerRef.current = event.target;
  };

  // Auto-scroll with user scroll detection
  useEffect(() => {
    if (!chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
    
    if (isNearBottom) {
      // User is near bottom, auto-scroll
      container.scrollTo({
        top: scrollHeight,
        behavior: 'smooth'
      });
      setHasNewMessages(false);
    } else {
      // User is scrolled up, show indicator
      setHasNewMessages(true);
    }
  }, [messages]);

  // Handle manual scroll
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    setShowScrollButton(!isNearBottom);
    
    if (isNearBottom) {
      setHasNewMessages(false);
    }
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setShowScrollButton(false);
      setHasNewMessages(false);
    }
  };


  
  useEffect(() => {
    if(!playerRef.current) return;
    
    try {
      if(isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.warn('Player action failed (player may be loading):', error);
    }
  }, [isPlaying]);
  
  const togglePlayPause = () => {
    if(!playerRef.current) return;
  
    try {
      const newState = !isPlaying;
      setIsPlaying(newState);
  
      const currentTime = playerRef.current.getCurrentTime();

      socket.emit(newState ? 'play-video' : 'pause-video', { roomId, username, time : currentTime });
    } catch (error) {
      console.error('Toggle play/pause failed:', error);
    }
  };
  
  useEffect(() => {
    // Join the room
    if (!roomId || !username) return;
    socket.emit("join-room", { roomId, username });
  
    // Handle room updates
    const handleRoomUpdate = ({ users, admin, currentVideo, timestamp }) => {
      setUsers(users);
      setAdmin(admin);
    
      console.log('Room update received:', { users, admin, currentVideo, timestamp });
      if (currentVideo) {
        setCurrentVideo({
          id: currentVideo.id,
          url: currentVideo.url,
          embedUrl: currentVideo.embedUrl,
        });
    
        if (playerRef.current) {
          playerRef.current.seekTo(timestamp || 0, true);
        }
      }
    };
    
    
  
    socket.on("room-update", handleRoomUpdate);
  
    // Handle new messages
    const handleNewMessage = ({ username, message }) => {
      addMessageToChat(`${username}: ${message}`);
    };
  
    socket.on("new-message", handleNewMessage);
  
    // Handle play/pause events
    const handlePlayVideo = ({ username: eventUsername, time }) => {
      try {
        // Only sync if the event is from another user
        if (eventUsername !== username) {
          setIsPlaying(true);
          if (playerRef.current) {
            playerRef.current.seekTo(time || 0, true);
            playerRef.current.playVideo();
          }
        }
        addMessageToChat(`${eventUsername} started playing the video.`);
      } catch (error) {
        console.error('Error handling play-video event:', error);
      }
    };
    
    const handlePauseVideo = ({ username: eventUsername, time }) => {
      try {
        // Only sync if the event is from another user
        if (eventUsername !== username) {
          setIsPlaying(false);
          if (playerRef.current) {
            playerRef.current.seekTo(time || 0, true);
            playerRef.current.pauseVideo();
          }
        }
        addMessageToChat(`${eventUsername} paused the video.`);
      } catch (error) {
        console.error('Error handling pause-video event:', error);
      }
    };
    
    socket.on("play-video", handlePlayVideo);
    socket.on("pause-video", handlePauseVideo);
  
    // Handle video loaded events
    const handleVideoLoaded = ({ videoId, username: eventUsername }) => {
      console.log('Video loaded event received:', { videoId, eventUsername });
      
      // CRITICAL: Clear player reference before setting new video
      playerRef.current = null;
      
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
    setMessages((prevMessages) => [...prevMessages, message].slice());
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
  
    // CRITICAL: Clear player reference before loading new video
    playerRef.current = null;
  
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
    let timestamp = playerRef.current ? playerRef.current.getCurrentTime() : 0;
    socket.emit('leave-room' , {roomId,currentVideo, timestamp});
    navigate('/');
  };

  const copyData = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };


  // const ToastContainer = ({ toasts, removeToast }) => (
  //   <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
  //   {toasts.map((toast) => (
  //     <div
  //       key={toast.id}
  //       className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
  //         toast.type === 'success' ? 'bg-green-500/90 border-l-4 border-green-400' :
  //         toast.type === 'error' ? 'bg-red-500/90 border-l-4 border-red-400' :
  //         toast.type === 'warning' ? 'bg-yellow-500/90 border-l-4 border-yellow-400' :
  //         'bg-blue-500/90 border-l-4 border-blue-400'
  //       }`}
  //     >
  //       <div className="flex-shrink-0">
  //         {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
  //         {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
  //         {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
  //         {toast.type === 'info' && <Info className="w-5 h-5" />}
  //       </div>
  //       <div className="flex-1 text-white text-sm font-medium">
  //         {toast.message}
  //       </div>
  //       <button
  //         onClick={() => removeToast(toast.id)}
  //         className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
  //       >
  //         <X className="w-4 h-4" />
  //       </button>
  //     </div>
  //   ))}
  //   </div>
  //   )
    
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 to-red-500 text-white">

      {/* Room Header */}
      <header className="bg-gradient-to-r from-purple-300 via-purple-400 to-purple-900 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between max-w-6xl mx-auto p-4 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-wide flex items-center">
              <img src="/logo.png" alt="logo" className="h-12 w-12 lg:h-[7rem] lg:w-[7rem] rounded-full" />
              <span className="ml-2">Let Us Watch</span>
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

      {/* <ToastContainer toasts={toasts} removeToast={removeToast} /> */}

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row justify-between mx-auto p-6 max-w-6xl">
        {/* Video Area */}
        <section className="flex-1">
          <div className="bg-black/20 backdrop-blur-lg rounded-xl border p-4  border-white/10 shadow-lg w-[100%]">
            {currentVideo ? (
              <div className="space-y-6 p-4">
                <div className="bg-black rounded-lg shadow-md">
                <YouTube
                  videoId={currentVideo.id}
                  onReady={onReady}
                  onStateChange={onStateChange}
                  opts={{
                    playerVars: { autoplay: 0, controls: 1}, width: '100%', height: '400'
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
          <div className="bg-white/10 mb-17 backdrop-blur-lg rounded-xl border border-white/20 flex flex-col h-96 W-FULL shadow-lg">
            <div className="p-4 border-b border-white/20">
              <h3 className="text-lg font-semibold flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat
              </h3>
            </div>
            <div className="relative">
              <div 
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent max-h-80"
              >
                {messages.length > 0 ? (
                  messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`text-sm p-2 rounded ${
                        message.includes('You ') ? 
                        'bg-purple-500/20 border-l-2 border-purple-500' : 
                        'bg-gray-500/10'
                      }`}
                    >
                      {message}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-purple-300 text-sm">
                    No messages yet. Start the conversation! 💬
                  </div>
                )}
              </div>
              
              {/* Scroll to bottom button */}
              {showScrollButton && (
                <button
                  onClick={scrollToBottom}
                  className={`absolute bottom-2 right-2 bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full shadow-lg transition-all duration-200 ${
                    hasNewMessages ? 'animate-pulse ring-2 ring-purple-300' : ''
                  }`}
                  title={hasNewMessages ? 'New messages' : 'Scroll to bottom'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  {hasNewMessages && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3"></span>
                  )}
                </button>
              )}
              
              {/* New message indicator */}
              {hasNewMessages && !showScrollButton && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-500/20 to-transparent h-8 flex items-end justify-center pb-1">
                  <span className="text-xs text-purple-300 animate-pulse">New messages ↓</span>
                </div>
              )}
            </div>
            {/* <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent">
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
            </div> */}
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