import { useState } from "react";
import { useParams } from "react-router-dom";
import "./MeetRoom.css";
import {
  useAssignUserRole,
  useJoinCall,
  useChatChannel,
} from "./hooks/useMeetRoomLogic";
import {
  StreamVideo,
  StreamCall,
  StreamTheme,
  SpeakerLayout,
  CallControls,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import {
  Chat,
  Channel,
  MessageInput,
  MessageList,
  Thread,
  Window,
  LoadingIndicator,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { useFaceDetection } from "./hooks/useEmotionDetect";

import {
  useUserStore,
  useVideoClientStore,
  useChatClientStore,
  usechannelIdStore,
} from "../../store";

const MeetRoom = () => {
  const { meetId } = useParams();
  const currentUser = useUserStore((state) => state.currentUser);
  const currentChatClient = useChatClientStore((state) => state.currentChatClient);
  const currentVideoClient = useVideoClientStore((state) => state.currentVideoClient);
  const setChannelId = usechannelIdStore((state) => state.setChannelId);

  const [highlightSpotlight, setHighlightSpotlight] = useState(false);

  const userRole = useAssignUserRole(meetId, currentUser);
  const { call, error: callError } = useJoinCall(currentVideoClient, meetId);
  const { channel, error: chatError } = useChatChannel(
    currentChatClient,
    meetId,
    currentUser,
    setChannelId
  );

  const { faces, status } = useFaceDetection(
    highlightSpotlight,
    ".spotlight-highlight .str-video__speaker-layout__spotlight video"
  );

  const CustomVideoLayout = () => {
    const { useParticipants } = useCallStateHooks();
    const participants = useParticipants();
    const isAlone = participants.length === 1;

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: isAlone ? "center" : "flex-start",
        alignItems: "center",
        paddingTop: isAlone ? "10%" : "2%",
      }}>
        <div style={{
          width: "100%",
          maxWidth: "800px",
          position: "relative"
        }}>
          <SpeakerLayout />
        </div>
        <div style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          padding: "16px 0",
        }}>
          <CallControls />
        </div>
      </div>
    );
  };

  const CustomChannelHeader = () => (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "64px",
      backgroundColor: "#fff",
      borderBottom: "1px solid #f0f0f0",
      padding: "0 20px",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 8V16H5V8H15ZM16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5V7C17 6.45 16.55 6 16 6Z"
            fill="#555"
          />
        </svg>
        <h2 style={{
          margin: 0,
          fontSize: "18px",
          fontWeight: 500,
          color: "#333",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          Meeting Room
        </h2>
      </div>
    </div>
  );

  if (!currentUser) return <div>Loading user data...</div>;
  if (callError || chatError) return <div>Error: {callError || chatError}</div>;
  if (!call) return <div>Joining call...</div>;
  if (!channel) return <LoadingIndicator />;

  return (
    <div className="meet-room-container" style={{ display: "flex", height: "100vh" }}>
      <div className="video-container" style={{
        flex: 2,
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}>
        {userRole === "host" && (
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'flex-end'
          }}>
            <button
              onClick={() => setHighlightSpotlight(!highlightSpotlight)}
              style={{
                padding: '8px 16px',
                background: highlightSpotlight ? '#4CAF50' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {highlightSpotlight ? 'Disable Detection' : 'Enable Detection'}
            </button>

            {status.lastDetection && (
              <div style={{
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                borderRadius: '4px'
              }}>
                Last detection: {status.lastDetection.emotion} ({Math.round(status.lastDetection.confidence * 100)}%)
              </div>
            )}

          </div>
        )}

        <div className={highlightSpotlight ? "spotlight-highlight" : ""}>
          <StreamVideo client={currentVideoClient}>
            <StreamCall call={call}>
              <StreamTheme>
                <CustomVideoLayout />
              </StreamTheme>
            </StreamCall>
          </StreamVideo>
        </div>
      </div>

      {currentChatClient && channel && (
        <div className="chat-container" style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
          <Chat client={currentChatClient}>
            <Channel channel={channel}>
              <Window>
                <CustomChannelHeader />
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