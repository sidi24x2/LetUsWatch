import axios from "axios";

const API = axios.create({
    baseURL:'http://localhost:3000/api/',
});

export const createRoom = async(username) => {
    const result = await API.post('/room/create' , {username});
    return result;
}

export const joinRoom = async(roomId , username)=> {
    const result = await API.post(`room/join`, {roomId , username});
    return result.data;
}