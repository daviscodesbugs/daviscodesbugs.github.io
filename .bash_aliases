alias ea="vim ~/.bash_aliases && source ~/.bash_aliases"
alias ls="ls -lh --color"
alias ll="ls -lAh --color"
alias fullupdate="sudo apt update && sudo apt upgrade -y && sudo apt dist-upgrade -y"
alias chrome="google-chrome"
alias rm="trash"
alias xclip="xclip -selection c"
alias yt-wav="youtube-dl -x --prefer-ffmpeg --audio-format wav"
alias yt-mp3="youtube-dl -x --prefer-ffmpeg --audio-format mp3"

alias ps="ps -o pid,user,time,command -A"

alias pmu="sudo pacman -Syu"
alias pmi="sudo pacman -S"

fullup() {
  sudo apt update
  sudo apt upgrade -y
  sudo apt dist-upgrade -y
  sudo apt autoclean
  sudo apt autoremove
  snap refresh
  flatpak update
}

# Convert a WAV file to a 320kbps MP3
wav2mp3() {
  file=${1%.wav}
  ffmpeg -i $1 -codec:a libmp3lame -b:a 320k $file.mp3
}

# Create a simple redirect html file
mkredir() {
  html="
    <!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv='Refresh' content='0; url=$1' />
        </head>
      </html>
  "
  echo $html >> $2
}

# Play a video in the terminal using ASCII art
terminal_video() {
  unset DISPLAY; mpv -vo caca ${1}
}

subrip() {
  for file in *.mkv ; do
    echo "$file"
    mkvmerge -o "${file%.mkv}.ripped.mkv" --no-subtitles --no-track-tags --no-global-tags --no-chapters "$file"
  done
}
