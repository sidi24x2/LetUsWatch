import axios from "axios";

// const API = axios.create({
//     baseURL:'https://letuswatch.onrender.com/api', // Update with your actual base URL
// });

const API = axios.create({
    baseURL:'http://localhost:3000/api', // Update with your actual base URL
});


export const createRoom = async(username) => {
    const result = await API.post('/room/create' , {username});
    return result;
}

export const joinRoom = async(roomId , username)=> {
    const result = await API.post(`room/join`, {roomId , username});
    return result.data;
}