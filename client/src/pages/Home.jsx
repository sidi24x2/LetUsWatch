import { Navigate, useNavigate } from "react-router-dom";
import {createRoom , joinRoom} from '../services/roomService';
import { useEffect, useState } from "react";
import socket from "../socket";


function Home() {
    const navigate = useNavigate();
    const [roomIdInput , setRoomIdInput] = useState('');
    const [username , setUsername] = useState(() => {
      return localStorage.getItem('LetUsWatchUsername') || '';
    });

    const [users , setUsers] = useState([]);
    
    const [isJoining , setIsJoining] = useState(false);

    const[isLoading , setIsLoading] = useState(false);    

    function saveUsername() {
        if(username.trim() !== '') {
          localStorage.setItem('LetUsWatchUsername', username);
        }
      }

    useEffect(() => {
        saveUsername();
      }, [username]);


    const handleCreate = async () => {
        try {
          setIsLoading(true);
          const data = await createRoom(username);
          const { roomId } = data.data;
          navigate(`/room/${roomId}` , {state : {username}});
        } catch (err) {
          console.error(err);
          alert("Failed to create room. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };
      

    useEffect(() => {
        const handler = (users) => {
          console.log("room-update received:", users);
          setUsers(users); // this should trigger re-render
        };
      
        socket.on("room-update", handler);
      
        return () => {
          socket.off("room-update", handler);
        };
      }, []);

     
      

    const handleJoin = async() => {
        try {
            let data = await joinRoom(roomIdInput , username);
            setIsLoading(true);

            console.log(`room found` , data);

            navigate(`/room/${roomIdInput}` , {state : {username}});
            
        } catch(err) {
            console.log(err)
            alert('Room not found');
        } finally{
          setIsLoading(false);
        }
      }
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-200 to-blue-50 flex items-center flex-col justify-center bg-[url('/home.jpg')] bg-cover bg-center bg-black/60 bg-blend-overlay">
            <div className="flex flex-col p-4 border-2 m-4 rounded-2xl mb-2 z-index-10 text-white ">
            <img
                src="/logo.png" // Path to the logo in the public folder
                alt="Logo"
                className="h-[20rem] w-[20rem] mx-auto my-[-5rem] brightness-0 invert" 
              />
            <label htmlFor="username" className="">Your Username <br/>
                <input type="text" name="username" className=" rounded-2xl my-4 p-4 border w-full outline-none" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)}/>
                
            </label>
            <button onClick={handleCreate}  className="rounded-2xl text-2xl p-4 cursor-pointer hover:bg-purple-400 bg-purple-300 text-white disabled:cursor-not-allowed" disabled={!username}>Create Room + </button>
            <div className="text-center my-4 font-bold flex justify-evenly items-center"> <hr className="border w-full"/> <span className="mx-2">OR</span><hr className="border w-full"/></div>

            {/* Joing Existing Room */}

            <button onClick={() => {
                setIsJoining(!isJoining)
            }} className="rounded-2xl bg-amber-200 text-2xl p-4 cursor-pointer hover:bg-amber-300">{isJoining ? '👥 Cancel' : '👥 Join Existing Room'}</button> 

           {isJoining && (
            <div className="flex-col my-4"> 
            <span className="text-2xl block">Room Id</span><input type="text" value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value)} id="" placeholder="Enter Room ID" className="p-4 border rounded-2xl w-full outline-none"/>
            <button className="rounded-2xl p-4 bg-sky-200 w-full mt-4 cursor-pointer disabled:cursor-not-allowed" disabled={!username} onClick={handleJoin} >Join Room ⎆</button>
            </div>
           )}
            
            <small className="font-semibold text-[10px] text-center mt-2">Share the room id with friends to watch together. </small>
           
            </div>
            
        </div>
    )
 

}

export default Home;




// NEwwww

