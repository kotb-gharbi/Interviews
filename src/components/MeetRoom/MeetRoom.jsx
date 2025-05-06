import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  StreamVideo,
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  CallControls,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { Chat, Channel, ChannelHeader, MessageInput, MessageList, Thread, Window,LoadingIndicator} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';

import { useUserStore, useVideoClientStore,useChatClientStore,usechannelIdStore } from "../../store";

const MeetRoom = () => {
  const { meetId } = useParams();
  const currentUser = useUserStore((state) => state.currentUser);
  const currentChatClient = useChatClientStore((state) => state.currentChatClient);
  const currentVideoClient = useVideoClientStore((state) => state.currentVideoClient);
  const setChannelId = usechannelIdStore((state) => state.setChannelId);
  
  const [call, setCall] = useState(null);
  const [channel, setChannel] = useState(null);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    if (!currentVideoClient || !meetId) return;


    const callInstance = currentVideoClient.call("default", meetId);
    callInstance.join({ create: true })
      .then(() => {
        setCall(callInstance);
        
      })
      .catch(err => {
        console.error("Error joining call:", err);
        setError("Failed to join call");
        
      });

    return () => {
      if (callInstance) {
        callInstance.leave().catch(console.error);
      }
    };
  }, [currentVideoClient, meetId]);

  useEffect(() => {
    if (!currentChatClient || !meetId || !currentUser?.id) return;

    const handleChannel = async () => {
      try {
        // First try to add user to existing channel
        const addRes = await fetch("http://127.0.0.1:8000/add-to-meeting-channel", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ 
            meet_id: meetId,
            user_id: currentUser.id 
          }),
        });

        if (!addRes.ok) {
          // If channel doesn't exist, create it
          const createRes = await fetch("http://127.0.0.1:8000/create-channel", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ 
              meet_id: meetId,
              user_id: currentUser.id 
            }),
          });

          if (!createRes.ok) throw new Error(await createRes.text());
          
          const createData = await createRes.json();
          setChannelId(createData.channel_id);
        } else {
          const addData = await addRes.json();
          setChannelId(addData.channel_id);
        }

        const channel = currentChatClient.channel("messaging", `meet_${meetId}`);
        await channel.watch();
        setChannel(channel);

      } catch (err) {
        console.error("Error handling channel:", err);
        setError("Failed to start chat");
      }
    };

    handleChannel();

    return () => {
      if (channel) channel.stopWatching().catch(console.error);
    };
  }, [currentChatClient, meetId, currentUser?.id]);

  if (!currentUser) return <div>Loading user data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!call) return <div>Joining call...</div>;
  if (!channel || !currentChatClient) return <LoadingIndicator />;

  return (
    <div className="meet-room-container" style={{ display: "flex", height: "100vh" }}>
      <div className="video-container" style={{ flex: 2 }}>
        <StreamVideo client={currentVideoClient}>
          <StreamCall call={call}>
            <StreamTheme>
              <SpeakerLayout />
              <CallControls />
            </StreamTheme>
          </StreamCall>
        </StreamVideo>
      </div>

      {currentChatClient && channel && (
        <div className="chat-container" style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
          <Chat client={currentChatClient}>
            <Channel channel={channel}>
              <Window>
                <ChannelHeader />
                <MessageList />
                <MessageInput />
              </Window>
              <Thread />
            </Channel>
          </Chat>
        </div>
      )}
    </div>
  );
};

export default MeetRoom;