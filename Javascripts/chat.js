// chat.js
// Real-time chat room system using Firebase Firestore
// Allows users to create study session chat rooms (max 10 people)

import { db } from "./firebase-config-loader.js";
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  where,
  limit,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

let currentRoomId = null;
let messagesUnsubscribe = null;
let roomsUnsubscribe = null;

/**
 * Get all active chat rooms
 */
export async function getChatRooms() {
  try {
    const roomsQuery = query(
      collection(db, "chatRooms"),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(roomsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    return [];
  }
}

/**
 * Create a new chat room
 */
export async function createChatRoom(user, roomName, roomDescription, roomPassword = "") {
  try {
    const roomData = {
      name: roomName,
      description: roomDescription,
      createdBy: user.uid,
      createdByName: user.displayName,
      members: [user.uid],
      capacity: 10,
      createdAt: serverTimestamp(),
      memberCount: 1,
      hasPassword: roomPassword ? true : false,
      password: roomPassword || "", // Store empty string if no password
    };

    const docRef = await addDoc(collection(db, "chatRooms"), roomData);
    console.log("Chat room created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating chat room:", error);
    throw error;
  }
}

/**
 * Join an existing chat room
 */
export async function joinChatRoom(roomId, user, password = "") {
  try {
    const roomRef = doc(db, "chatRooms", roomId);
    const roomDoc = await getDocs(query(collection(db, "chatRooms"), where("__name__", "==", roomId)));
    
    if (roomDoc.empty) {
      throw new Error("Room not found");
    }

    const room = roomDoc.docs[0].data();
    
    // Check if room requires password
    if (room.hasPassword && room.password && room.password !== password) {
      throw new Error("Incorrect password");
    }
    
    // Check if room is full
    if (room.members.length >= room.capacity) {
      throw new Error("Room is full");
    }

    // Check if user is already in room
    if (room.members.includes(user.uid)) {
      currentRoomId = roomId;
      return;
    }

    // Add user to room
    await updateDoc(roomRef, {
      members: arrayUnion(user.uid),
      memberCount: room.members.length + 1,
    });

    currentRoomId = roomId;
    console.log("Joined room:", roomId);
  } catch (error) {
    console.error("Error joining room:", error);
    throw error;
  }
}

/**
 * Leave current chat room
 */
export async function leaveRoom(roomId, userId) {
  try {
    const roomRef = doc(db, "chatRooms", roomId);
    const roomDoc = await getDocs(query(collection(db, "chatRooms"), where("__name__", "==", roomId)));
    
    if (!roomDoc.empty) {
      const room = roomDoc.docs[0].data();
      await updateDoc(roomRef, {
        members: arrayRemove(userId),
        memberCount: Math.max(0, room.members.length - 1),
      });
    }

    currentRoomId = null;
    console.log("Left room:", roomId);
  } catch (error) {
    console.error("Error leaving room:", error);
  }
}

/**
 * Delete a room entirely
 */
export async function deleteChatRoom(roomId) {
  try {
    // Delete all messages (if a subcollection exists)
    const messagesSnapshot = await getDocs(collection(db, "chatRooms", roomId, "messages"));
    const batchDeletes = messagesSnapshot.docs.map((msgDoc) => deleteDoc(doc(db, "chatRooms", roomId, "messages", msgDoc.id)));
    await Promise.all(batchDeletes);

    // Delete room doc
    await deleteDoc(doc(db, "chatRooms", roomId));
    console.log("Chat room deleted:", roomId);
  } catch (error) {
    console.error("Error deleting chat room:", error);
    throw error;
  }
}

/**
 * Send a message to current room
 */
export async function sendMessage(roomId, user, messageText) {
  try {
    if (!messageText.trim()) {
      console.warn("Message is empty");
      return;
    }

    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    await addDoc(messagesRef, {
      text: messageText,
      userId: user.uid,
      userName: user.displayName,
      userPhoto: user.photoURL || "https://via.placeholder.com/32",
      timestamp: serverTimestamp(),
    });

    console.log("Message sent to room:", roomId);
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Listen to real-time messages in a room
 */
export function listenToMessages(roomId, callback) {
  try {
    const messagesQuery = query(
      collection(db, "chatRooms", roomId, "messages"),
      orderBy("timestamp", "asc"),
      limit(100),
    );

    messagesUnsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(messages);
      },
      (error) => {
        console.error("Error listening to messages:", error);
      },
    );

    return messagesUnsubscribe;
  } catch (error) {
    console.error("Error setting up message listener:", error);
  }
}

/**
 * Listen to room list updates
 */
export function listenToRooms(callback) {
  try {
    const roomsQuery = query(
      collection(db, "chatRooms"),
      orderBy("createdAt", "desc"),
      limit(50),
    );

    roomsUnsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const rooms = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(rooms);
      },
      (error) => {
        console.error("Error listening to rooms:", error);
      },
    );

    return roomsUnsubscribe;
  } catch (error) {
    console.error("Error setting up room listener:", error);
  }
}

/**
 * Stop listening to messages
 */
export function stopMessagesListener() {
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
    messagesUnsubscribe = null;
  }
}

/**
 * Stop listening to rooms
 */
export function stopRoomsListener() {
  if (roomsUnsubscribe) {
    roomsUnsubscribe();
    roomsUnsubscribe = null;
  }
}

/**
 * Get current room ID
 */
export function getCurrentRoomId() {
  return currentRoomId;
}

/**
 * Set current room ID
 */
export function setCurrentRoomId(roomId) {
  currentRoomId = roomId;
}
