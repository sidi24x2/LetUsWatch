
import React, { useState, useRef, useEffect } from 'react';
import { Video, Users, Plus, LogIn, Copy, Check, LogOut, Play, Pause, ExternalLink, Send, MessageCircle } from 'lucide-react';

const WatchTogether = () => {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const chatRef = useRef(null);

  // Generate a random room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (!username.trim()) {
      alert('Please enter your username first!');
      return;
    }
    const newRoomId = generateRoomId();
    setCurrentRoom(newRoomId);
    // Add the creator as the first user
    setRoomUsers([{
      id: 1,
      name: username.trim(),
      isOwner: true,
      joinedAt: new Date().toLocaleTimeString()
    }]);
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      alert('Please enter your username first!');
      return;
    }
    if (!roomId.trim()) {
      alert('Please enter a room ID!');
      return;
    }
    setCurrentRoom(roomId.toUpperCase());
    // Simulate joining a room with some existing users
    setRoomUsers([
      {
        id: 1,
        name: 'RoomOwner',
        isOwner: true,
        joinedAt: '2:30 PM'
      },
      {
        id: 2,
        name: username.trim(),
        isOwner: false,
        joinedAt: new Date().toLocaleTimeString()
      }
    ]);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(currentRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setRoomUsers([]);
    setRoomId('');
    setIsJoining(false);
    setCurrentVideo(null);
    setVideoUrl('');
    setIsPlaying(false);
    setMessages([]);
    setNewMessage('');
  };

  // Extract YouTube video ID from URL
  const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Load a new video
  const loadVideo = () => {
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL!');
      return;
    }
    
    setCurrentVideo({
      id: videoId,
      url: videoUrl,
      embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`,
      title: `Video ${videoId}`,
      loadedBy: username,
      loadedAt: new Date().toLocaleTimeString()
    });
    
    setVideoUrl('');
    setIsPlaying(false);
    
    // Simulate notifying other users
    console.log(`${username} loaded a new video: ${videoId}`);
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    // In a real app, this would sync with other users
    console.log(`${username} ${!isPlaying ? 'played' : 'paused'} the video`);
  };

  // Send a chat message
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message = {
      id: Date.now(),
      user: username,
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString(),
      isOwn: true
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Simulate receiving messages from other users occasionally
    if (Math.random() > 0.7 && roomUsers.length > 1) {
      setTimeout(() => {
        const otherUser = roomUsers.find(u => u.name !== username);
        if (otherUser) {
          const responses = [
            "Nice choice! 👍",
            "Love this part!",
            "😂😂😂",
            "Anyone else getting lag?",
            "This is so good!",
            "Wait, let me catch up",
            "LOL"
          ];
          
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            user: otherUser.name,
            text: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date().toLocaleTimeString(),
            isOwn: false
          }]);
        }
      }, 1000 + Math.random() * 3000);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Add some initial system messages when room is created
  useEffect(() => {
    if (currentRoom && messages.length === 0) {
      const welcomeMessages = [
        {
          id: Date.now(),
          user: 'System',
          text: `Welcome to room ${currentRoom}! 🎉`,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true
        },
        {
          id: Date.now() + 1,
          user: 'System',
          text: `${username} joined the room`,
          timestamp: new Date().toLocaleTimeString(),
          isSystem: true
        }
      ];
      setMessages(welcomeMessages);
    }
  }, [currentRoom]);

  // If user is in a room, show the room interface
  if (currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Room Header */}
        <div className="bg-black/20 backdrop-blur-lg border-b border-white/10 p-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              {/* <Video className="w-8 h-8 text-purple-300" /> */}
              <h1 className="text-xl font-bold text-white">Watch Together</h1>
              <div className="flex items-center space-x-2 bg-white/10 px-3 py-2 rounded-full">
                <span className="text-purple-200 text-sm">Room:</span>
                <span className="text-white font-mono font-bold">{currentRoom}</span>
                <button 
                  onClick={copyRoomId}
                  className="text-purple-300 hover:text-purple-200 transition-colors ml-1"
                  title="Copy room ID"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-purple-200">
                <Users className="w-4 h-4" />
                <span className="text-sm">{roomUsers.length} online</span>
              </div>
              <button
                onClick={leaveRoom}
                className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex max-w-6xl mx-auto p-4 space-x-4">
          {/* Video Area */}
          <div className="flex-1">
            <div className="bg-black/20 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              {/* Video Player */}
              {currentVideo ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <iframe
                      src={currentVideo.embedUrl}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  
                  {/* Video Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{currentVideo.title}</h3>
                      <p className="text-purple-300 text-sm">
                        Loaded by {currentVideo.loadedBy} at {currentVideo.loadedAt}
                      </p>
                    </div>
                    <a
                      href={currentVideo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-300 hover:text-purple-200 transition-colors"
                      title="Open on YouTube"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>

                  {/* Video Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={togglePlayPause}
                      className="bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-full transition-colors"
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </button>
                    <div className="text-purple-300 text-sm">
                      {isPlaying ? 'Playing' : 'Paused'} • Synced with {roomUsers.length} viewer{roomUsers.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center text-purple-200">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No video loaded</p>
                    <p className="text-sm opacity-75">Share a YouTube URL below to start watching together</p>
                  </div>
                </div>
              )}
              
              {/* URL Input */}
              <div className="mt-6">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Paste YouTube URL here (e.g., https://youtu.be/dQw4w9WgXcQ)"
                    className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && loadVideo()}
                  />
                  <button
                    onClick={loadVideo}
                    disabled={!videoUrl.trim()}
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
          </div>

          {/* Sidebar */}
          <div className="w-80 space-y-4">
            {/* Chat */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 flex flex-col h-96">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/20">
                <h3 className="text-white font-semibold flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Chat ({messages.length})
                </h3>
              </div>
              
              {/* Messages */}
              <div 
                ref={chatRef}
                className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent"
              >
                {messages.map((message) => (
                  <div key={message.id} className={`${message.isSystem ? 'text-center' : ''}`}>
                    {message.isSystem ? (
                      <div className="text-purple-300 text-xs bg-purple-500/20 rounded-full px-3 py-1 inline-block">
                        {message.text}
                      </div>
                    ) : (
                      <div className={`${message.isOwn ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block max-w-xs rounded-lg px-3 py-2 ${
                          message.isOwn 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/20 text-white'
                        }`}>
                          <div className="text-xs opacity-75 mb-1">
                            {message.user} • {message.timestamp}
                          </div>
                          <div className="text-sm">{message.text}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {messages.length === 0 && (
                  <div className="text-center text-purple-300 text-sm">
                    No messages yet. Start the conversation! 💬
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-white/20">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 p-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    maxLength={200}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-purple-300 mt-1 text-right">
                  {newMessage.length}/200
                </div>
              </div>
            </div>

            {/* Users List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-semibold mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Online ({roomUsers.length})
              </h3>
              <div className="space-y-2">
                {roomUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-white text-sm font-medium">{user.name}</span>
                      {user.isOwner && (
                        <span className="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded text-xs">
                          Owner
                        </span>
                      )}
                    </div>
                    <span className="text-purple-300 text-xs">{user.joinedAt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-semibold mb-3">Room Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-200">Room ID:</span>
                  <span className="text-white font-mono">{currentRoom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Messages:</span>
                  <span className="text-white">{messages.filter(m => !m.isSystem).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-200">Status:</span>
                  <span className="text-green-400">Active</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-purple-500/20 rounded-lg">
                <p className="text-purple-200 text-xs">
                  💡 Chat with friends while watching together! Messages sync in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Landing page (when not in a room)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Video className="w-12 h-12 text-purple-300 mr-3" />
            <h1 className="text-3xl font-bold text-white">Watch Together</h1>
          </div>
          <p className="text-purple-200">Sync YouTube videos with friends in real-time</p>
        </div>

        {/* Username Input */}
        <div className="mb-6">
          <label className="block text-purple-200 mb-2 text-sm font-medium">
            Your Username
          </label>
          <input
            type="text"
            placeholder="Enter your username"
            className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isJoining && handleCreateRoom()}
          />
        </div>

        {/* Create Room Button */}
        <button
          onClick={handleCreateRoom}
          disabled={!username.trim()}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center mb-4"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Room
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <hr className="flex-1 border-white/20" />
          <span className="px-4 text-purple-200 text-sm">OR</span>
          <hr className="flex-1 border-white/20" />
        </div>

        {/* Join Room Section */}
        <div className="space-y-4">
          <button
            onClick={() => setIsJoining(!isJoining)}
            className="w-full bg-white/10 text-purple-200 py-3 px-6 rounded-lg font-medium hover:bg-white/20 transition-colors flex items-center justify-center"
          >
            <Users className="w-5 h-5 mr-2" />
            {isJoining ? 'Cancel' : 'Join Existing Room'}
          </button>

          {isJoining && (
            <div className="space-y-4 animate-in slide-in-from-top duration-200">
              <div>
                <label className="block text-purple-200 mb-2 text-sm font-medium">
                  Room ID
                </label>
                <input
                  type="text"
                  placeholder="Enter room ID (e.g. ABC123)"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all uppercase"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={!username.trim() || !roomId.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Join Room
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-purple-300 text-xs">
            Share the room ID with friends to watch together!
          </p>
        </div>
      </div>
    </div>
  );
};

export default WatchTogether;