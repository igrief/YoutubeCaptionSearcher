
var apiKey = 'AIzaSyAOXoWi4Klu7Lw3-Acqkoovr_qkC0EoU0U';
var videoIdToCaptions = new Map(); //map from videoId to caption string
var channelId;



window.onload = function(){
    document.getElementById("channelForm").onsubmit = updateChannel;  
    document.getElementById("captionForm").onsubmit = submitQuote;
}


function updateChannel(){
    var channelName = document.getElementById("channelText").value;
    if(channelName){
        console.log("Channel name: " + channelName);
        document.getElementById("channelNameText").innerHTML = channelName;
        getChannels(channelName);
    } else{
        alert("Channel name not set");
    }
    
    return false; //this is currently necessary because submitting the form refreshes the page 
    //which messes everything up! apparently we shouldn't need a form - 
    //maybe something else would be better? 
}

function submitQuote(){
    var quote = document.getElementById("quoteText").value;
    if(quote){
        document.getElementById("captionInputText").innerHTML = quote;
        quote = quote.toLowerCase();
        var videoIds = Array.from(videoIdToCaptions.keys());
        console.log(`Attempting to pattern match ${quote}...`);
        var matchMap = new Map();
        videoIds.forEach(id => {
            matchMap.set(id, boyerMoore(quote, videoIdToCaptions.get(id)));
        })
        console.log(`Done pattern matching`);
        var matches = Array.from(matchMap.keys());
        matches = matches.filter(id => matchMap.get(id)); //all the videoIds that returned TRUE
        console.log(matches);
        //document.getElementById("debug").innerHTML = matches;
        
        findVideoDetails(matches);

    } else{
        alert("Please enter a quote");
    }
    return false; //again currently necessary to not refresh page 
}

async function findVideoDetails(matches){
    var nameToId = new Map();
    const anAsyncFunction = async videoId => {
        var name = await getVideoName(videoId);
        nameToId.set(name, videoId);
        return name;
    }
    const getData = async () => {
        return Promise.all(matches.map(item => anAsyncFunction(item)))
    }
    getData().then(data => {
        data.forEach(name => {
            var term = document.createElement("dt");
            term.appendChild(document.createTextNode(name));
            document.getElementById("resultsList").appendChild(term);


            var a = document.createElement("a");
            var description = document.createElement("dd");

            var link = `https://www.youtube.com/watch?v=${nameToId.get(name)}`;
            a.textContent = link;
            a.setAttribute('href', link);
            description.appendChild(a);
            document.getElementById("resultsList").appendChild(description);
        })
    });
}

async function getVideoName(videoId){
    if(!videoId){
        console.log(`Video ID invalid`);
        return;
    }
    console.log(`Attempting to fetch video details...`);
    try{
        const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);
        console.log(`Done waiting for response`);
        if(response.ok){
            const jsonResponse = await response.json();
            //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
            //console.log(JSON.stringify(jsonResponse));
            if(jsonResponse.items.length > 0){
                console.log(jsonResponse.items[0].snippet.title);
                return jsonResponse.items[0].snippet.title;
            }
return jsonResponse.title;
        } else{
            throw new Error('Request Failed!');
        }
    }
    catch (error) {
        alert(error);
    }
}


async function getChannels(channelName){
    if(!channelName){
        console.log(`Channel name invalid`);
        return;
    }
    console.log(`Attempting to fetch channel ID...`);
    try{
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelName}&type=channel&fields=items%2Fsnippet%2FchannelId&key=${apiKey}`);
        console.log(`Done waiting for response`);
        if(response.ok){
            const jsonResponse = await response.json();
            //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
            if(jsonResponse.items.length <= 0){
                alert("No channels found");
                return;
            } else{
                //we can change this to allow users to select from the list of channels
                channelId = jsonResponse.items[0].snippet.channelId;
                console.log(`Channel ID = ${channelId}`);
            }
            //if it is not valid (no channels), then it returns {"items":[]}
        } else{
            throw new Error('Request Failed!');
        }
    }
    catch (error) {
        alert(error);
    }
    
    getCaptions(); //now fetch everything else 
}


//this function will grab all captions for every video in the stored channel
async function getCaptions(){
    if(!channelId){
        console.log(`Invalid channel ID`);
        return;
    }

    console.log(`Attempting to fetch playlistId of uploads...`);
    var playlistId;
    try{ //store the playlistId full of uploads
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${apiKey}&part=contentDetails`);
        console.log(`Done waiting for response`);
        if(response.ok){
            const jsonResponse = await response.json();
            //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
            if(jsonResponse.items.length <= 0){
                alert("No playlists found");
                return;
            } else{
                playlistId = jsonResponse.items[0].contentDetails.relatedPlaylists.uploads;
                console.log(`Playlist ID = ${playlistId}`);
            }
        } else{
            throw new Error('Request Failed!');
        }
    }
    catch (error) {
        alert(error);
    }


    var pageToken = "";
    console.log(`Attempting to fetch videoIds of uploads...`);
    while(true){ //we will break out once we have all the videos - need loop for pageTokens
        console.log(`Iterating for page token =${pageToken}`);
        try{ //store all videoIds (put it in the map, map it to "");
            const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50${pageToken}&playlistId=${playlistId}&key=${apiKey}`);
            console.log(`Done waiting for response`);
            if(response.ok){
                const jsonResponse = await response.json();

                if(jsonResponse.items.length <= 0){
                    break;
                } else{ //store videoIds
                    jsonResponse.items.forEach(element => videoIdToCaptions.set(element.contentDetails.videoId, ""));
                    
                    //get next page token
                    var nextPageToken = jsonResponse.nextPageToken;
                    console.log(`next page token = ${nextPageToken}`);
                    if(nextPageToken){
                        pageToken = `&pageToken=${nextPageToken}`;
                    } else{
                        break;
                    }
                }
            } else{
                throw new Error('Request Failed!');
            }
        }
        catch (error) {
            alert(error);
        }
    } //end of getting videoIds
    

    videoIdToCaptions.forEach((value, key, videoIdToCaptions) => console.log(`value = ${value}, key=${key}`));

    var videoIds = Array.from(videoIdToCaptions.keys());
    console.log(videoIds);
    console.log(`Attempting to fetch captions for each videoId asynchronously...`);
    //get captions
    var asyncCaptionFx = videoIds.map(elem => async () => {
        //get the caption and put it in the map
        videoIdToCaptions.set(elem, await getData(`http://video.google.com/timedtext?lang=en&v=${elem}`));
    });
    var asyncCaptionFx = asyncCaptionFx.map(fx => fx()); 

    await Promise.all(asyncCaptionFx); 
    console.log(`Done fetching all captions`);
    videoIdToCaptions.forEach((value, key, videoIdToCaptions) => console.log(`value = ${value}, key=${key}`));
}

//should return the captions as a string
async function getData(url){
    console.log(`Attempting to fetch captions at ${url}...`);
    try{
        const response = await fetch(url);
        console.log(`Done waiting for response`);
        if(response.ok){
            const xmlResponse = await response.text();
            let parser = new DOMParser();
            let xmlDoc = parser.parseFromString(xmlResponse, "text/xml");
            //everything is in a <text> tag 
            let textList = xmlDoc.getElementsByTagName("text");
            let text = "";
            for(let i = 0; i < textList.length; i++){
                text += textList[i].childNodes[0].nodeValue + " ";
            }
            //note: text will be stored along with special characters like &#39; 
            //      input text will need to keep this in mind
            console.log(`Text is ${text.length} characters`);
            return text.toLowerCase();
        }
        throw new Error('Request Failed!');
    }
    catch (error) {
        alert(error);
    }
}

  
//function returns true if there is a match, false if no match
function boyerMoore(pattern, text){
    console.log(`Attempting to discover match for pattern ${pattern}`);
    const jumpTable = new Map(); 
    let distance = 1;
    for(let k = pattern.length - 2; k >= 0; k--){
        if(jumpTable.has(pattern[k]) && distance < jumpTable.get(pattern[k])){ //update distances
            jumpTable.set(pattern[k], distance);
        } else if(!jumpTable.has(pattern[k])){ //add new entry
            jumpTable.set(pattern[k], distance);
        }
        distance++;
    }
    let i = pattern.length -1; 
    let j = i;
    let last = i; //keeps track of the furthest index in the text 
    while(i <= text.length - 1){ 
        if(pattern[j] === text[i]){
            if(j === 0){ //matched the full pattern
                console.log(`Match found!`);
                return true;
            } else{ //look at the rest of the elements to determine full match
                i--;
                j--;
            }
        } else{
            let incr = jumpTable.get(text[i]);
            if(!incr){ //if text[i] isnt in the pattern then it is undefined in map
                incr = pattern.length;
            }
            i = last + incr; //jump ahead as far as possible according to jump table
            j = pattern.length - 1; //reset to end for next round of comparisons
            last = i; //update position of the last pointer 
        }
    }
    console.log(`No match found.`);
    return false;
}