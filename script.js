// Add event listener to the search form
document.getElementById("searchForm").addEventListener("submit", function (event) {
  // Prevent default form submission behavior
  event.preventDefault();
});
// Add event listener to the search button
document.getElementById("searchButton").addEventListener("click", function () {
  // Get the artist name from the input field
  const artistName = document.getElementById("artist").value;

  if (artistName.trim()) {
    fetchArtistData(artistName);
  }
});

async function fetchAllReleaseGroups(artistId) {
  const perPage = 100;
  let offset = 0;
  let allReleaseGroups = [];
  let hasMore = true;

  while (hasMore) {
    const url = `https://musicbrainz.org/ws/2/release-group?artist=${artistId}&offset=${offset}&limit=${perPage}&fmt=json`;
    const releaseGroupsData = await fetchWithRetry(url);
    const releaseGroups = releaseGroupsData['release-groups'];
    allReleaseGroups = allReleaseGroups.concat(releaseGroups);

    if (releaseGroups.length < perPage) {
      hasMore = false;
    } else {
      offset += perPage;
    }
  }

  return allReleaseGroups;
}

async function fetchArtistData(artistName) {
  const apiUrl = `https://musicbrainz.org/ws/2/artist/?query=artist:${artistName}&fmt=json`;
  // Fetch artist information
  const data = await fetchWithRetry(apiUrl);
  console.log(data);

  // Extract the artist ID from the response
  const artistId = data.artists[0].id;

  // Fetch all the release groups using the artist ID
  const allReleaseGroups = await fetchAllReleaseGroups(artistId);
  const releaseGroups = allReleaseGroups.filter((releaseGroup) => {
    const primaryType = releaseGroup['primary-type'];
    const secondaryTypes = releaseGroup['secondary-types'] || [];
    return primaryType === 'Album' && secondaryTypes.length === 0;
  });

  // Sort release groups by release date
  const sortedReleaseGroups = releaseGroups.sort((a, b) => {
    return new Date(a['first-release-date']) - new Date(b['first-release-date']);
  });

  // Extract the album names from the sorted release groups
  const albumNames = sortedReleaseGroups.map((releaseGroup) => {
    return {
      title: releaseGroup.title,
      year: releaseGroup['first-release-date'].substring(0, 4),
    };
  });

  // Display the album names
  displayAlbumNames(albumNames);
}



// Function to display the album names
function displayAlbumNames(albums) {
  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headerRow = document.createElement("tr");

  

  ["Title", "Release Year"].forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  albums.forEach((album) => {
    const row = document.createElement("tr");
    const titleCell = document.createElement("td");
    const yearCell = document.createElement("td");

    titleCell.textContent = album.title;
    yearCell.textContent = album.year;

    row.appendChild(titleCell);
    row.appendChild(yearCell);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);

    // ...
    
    // Create a container div for the table
    const tableContainer = document.createElement("div");
    tableContainer.classList.add("table-container");
  
    // Append the table to the container div
    tableContainer.appendChild(table);
  
    // Clear the previous album list if it exists
    const albumsDiv = document.getElementById("albums");
    albumsDiv.innerHTML = "";
  
    // Append the new album table container
    albumsDiv.appendChild(tableContainer);
  }
  



// Helper function to sleep for a specified duration (in milliseconds)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//exponential backoff
async function fetchWithRetry(url, retries = 3, delay = 1100) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();
      return data;
    } catch (error) {
      if (i < retries - 1) {
        await sleep(delay);
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}
