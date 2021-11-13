import React, { useState } from "react";
import { useSnapshot } from "valtio";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Slider from "@mui/material/Slider";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LoopIcon from "@mui/icons-material/Loop";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import store, * as storeUtils from "./store";
import SelectPlaylist from "./SelectPlaylist";
import { PLAY_MODE, PLAYLIST_TYPE, formatScondTime } from "../utils";

export default function Player() {
  const snap = useSnapshot(store);
  const [showVolumeBar, setShowVolumeBar] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const {
    userId,
    playing,
    selectedSong,
    selectedPlaylist,
    volume,
    playMode,
    audioState: { currentTime, duration },
  } = snap;

  const handleTimeChange = (e, percent) => {
    const {
      audioState: { duration },
    } = snap;
    const currentTime = (percent * duration) / 100;
    storeUtils.updateAudioTime(currentTime);
  };

  const handleVolumeChange = (e) => {
    storeUtils.updateVolume(1 - e.target.value);
  };

  const handleLikeSong = (playlistId) => {
    setShowModal(false);
    storeUtils.likeSong(playlistId);
  };

  const currentTimeStr = formatScondTime(currentTime);
  const durationTimeStr = formatScondTime(duration);
  const percentPlayed = (currentTime / duration) * 100 || 0;

  const renderLikeBtn = () => {
    if (!userId) return;
    if (selectedPlaylist?.type === PLAYLIST_TYPE.CLOUD) return;
    if (selectedPlaylist?.type === PLAYLIST_TYPE.CRATE) {
      return (
        <IconButton onClick={() => storeUtils.unlikeSong()} title="取消收藏">
          <FavoriteIcon />
        </IconButton>
      );
    } else {
      return (
        <IconButton onClick={() => setShowModal(true)} title="收藏">
          <FavoriteBorderIcon />
        </IconButton>
      );
    }
  };

  let playModeIcon, playModeTitle;

  switch (playMode) {
    case PLAY_MODE.SHUFFLE:
      playModeIcon = <ShuffleIcon />;
      playModeTitle = "随机";
      break;
    case PLAY_MODE.ONE:
      playModeIcon = <CompareArrowsIcon />;
      playModeTitle = "单曲循环";
      break;
    default:
      playModeIcon = <LoopIcon />;
      playModeTitle = "循环";
      break;
  }

  return (
    <Grid container alignItems="center" sx={{ background: "white", p: 1 }}>
      <Grid item alignItems="center">
        <IconButton onClick={() => storeUtils.playPrev()} title="上一首">
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          onClick={() => storeUtils.togglePlaying()}
          title="播放/暂停"
        >
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton onClick={() => storeUtils.playNext()} title="下一首">
          <SkipNextIcon />
        </IconButton>
      </Grid>
      <Grid
        item
        alignItems="center"
        sx={{ flexGrow: 1, display: "flex", mx: 1 }}
      >
        {selectedSong?.picUrl ? (
          <Avatar src={selectedSong?.picUrl} alt="song pic" />
        ) : (
          <Avatar alt="song pic">S</Avatar>
        )}
        <Grid container direction="column" sx={{ mx: 1 }}>
          <Grid item sx={{ display: "flex", alignItems: "baseline" }}>
            <Box
              sx={{
                maxWidth: 175,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {selectedSong?.name || "歌名"}
            </Box>
            <Box
              sx={{
                ml: 2,
                maxWidth: 175,
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
                fontSize: "14px",
                opacity: 0.6,
              }}
            >
              {selectedSong?.artists || "歌手"}
            </Box>
          </Grid>
          <Grid item alignItems="center" sx={{ display: "flex" }}>
            <Box sx={{ width: "100%", mx: 1 }}>
              <Slider
                value={percentPlayed}
                min={0}
                step={1}
                max={100}
                onChange={handleTimeChange}
              />
            </Box>
          </Grid>
        </Grid>
        <Box sx={{ whiteSpace: "nowrap" }}>
          {currentTimeStr} / {durationTimeStr}
        </Box>
      </Grid>
      <Grid item alignItems="center">
        {renderLikeBtn()}
        <IconButton
          onClick={() => storeUtils.updatePlayMode()}
          title={playModeTitle}
        >
          {playModeIcon}
        </IconButton>
        <IconButton
          onClick={() => setShowVolumeBar(!showVolumeBar)}
          title="音量"
        >
          {volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
        <Box
          sx={{
            height: 100,
            display: showVolumeBar ? "block" : "none",
            position: "absolute",
            zIndex: 99,
            right: 11,
          }}
        >
          <Slider
            value={1 - volume}
            orientation="vertical"
            track="inverted"
            step={0.01}
            min={0}
            max={1}
            onChange={(e) => handleVolumeChange(e)}
          />
        </Box>
      </Grid>

      <SelectPlaylist
        open={showModal}
        onClose={() => setShowModal(false)}
        onChange={handleLikeSong}
        title="收藏歌曲"
      />
    </Grid>
  );
}
