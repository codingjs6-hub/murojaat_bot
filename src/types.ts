export type AiMessageType = "APPEAL" | "THANKS" | "STATUS" | "OTHER";

export type AiResult = {
  turi: AiMessageType;
  kategoriya: string | null;
  tashkilot: string | null;
  xulosa: string;
};

export type SessionPhoto = {
  fileId: string;
  fileUniqueId?: string;
};

export type SessionVideo = {
  fileId: string;
};

export type SessionLocation = {
  latitude: number;
  longitude: number;
};

export type Session = {
  sessionId: string;
  status: "collecting" | "processing" | "done" | "cancelled";

  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  chatId: number;

  messages: string[];
  photos: SessionPhoto[];
  videos: SessionVideo[];
  location?: SessionLocation | null;
  phone?: string | null;

  timer: NodeJS.Timeout;
  closed: boolean;
};
