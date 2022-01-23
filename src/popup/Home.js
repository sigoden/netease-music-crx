import React from "react";
import { useSnapshot } from "valtio";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import Player from "./Player";
import PlayList from "./PlayList";
import store from "./store";

export default function Home() {
  const snap = useSnapshot(store);
  const navigate = useNavigate();
  return (
    <Box sx={{ width: 800 }}>
      <Player />
      <PlayList maxHeight={400} />
      {snap.message && (
        <Alert severity={snap.isErr ? "error" : "success"}>
          {snap.message}
        </Alert>
      )}
      {!snap.userId && (
        <Box sx={{ p: 3, textAlign: "center", background: "white" }}>
          <Link href="#" onClick={() => navigate("/login", { replace: true })}>
            登录
          </Link>
          后获取个性化推荐及我的歌单
        </Box>
      )}
    </Box>
  );
}
