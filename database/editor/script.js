const editorDiv = document.getElementById("Editor");
const searchForMalId = document.getElementById("SearchForMalId");



searchForMalId.addEventListener("keyup", function(event) {
  if (event.key === "Enter") {
    // Cancel the default action, if needed
    event.preventDefault();


    reload(searchForMalId.value);

    searchForMalId.value = "";


  }
});


const reload = async (malId) => {

  editorDiv.innerHTML = "";

  let songs;
  if(malId) {
    songs = (await (await fetch(`/database/${malId}`)).json()).songs;
  }
  else {
    songs = (await (await fetch("/database")).json()).songs;
  }

  const sorted = {};

  for(song of songs) {
    if(!sorted[song.MalId]) sorted[song.MalId] = [];

    sorted[song.MalId].push(song);
  }

  for(const [key, value] of Object.entries(sorted)) {
    const opener = document.createElement("div");
    const title = document.createElement("p");
    title.innerHTML = value[0].AnimeTitle;

    // styling
    opener.style.border = "2px solid black"
    opener.style.overflow = "auto";


    let toggle = true;


    // functionality
    title.onclick = () => {
      opener.innerHTML = "";
      opener.appendChild(title);

      if(toggle = !toggle) return;

      for(const song of value) {
        const songDiv = document.createElement("div");
        const id = document.createElement("p");
        const type = document.createElement("p");
        const url = document.createElement("p");
        const delButton = document.createElement("button");

        id.innerHTML = `MyAnimeList Id: ${song.MalId}`;
        type.innerHTML = `Song Type: ${song.SongType}`;
        url.innerHTML = `Song Url: ${song.SongUrl}`;

        songDiv.style.border = "1px solid black";

        delButton.onclick = async () => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/database_del", true);
          xhr.setRequestHeader('Content-Type', 'application/json');

          xhr.onreadystatechange = () => {
            if(xhr.readyState == 4 && xhr.status == 200) {
              location.reload();
            }
          }

          xhr.send(JSON.stringify({
            id: song.Id
          }));
        }

        delButton.textContent = "X"

        songDiv.appendChild(id);
        songDiv.appendChild(type);
        songDiv.appendChild(url);
        songDiv.appendChild(delButton);
        opener.appendChild(songDiv);
      }
    }

    opener.appendChild(title);
    editorDiv.appendChild(opener);
  }
};

reload();


