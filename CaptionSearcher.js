/*
Copyright 2020, Isaiah Grief, All rights reserved.

This program uses the Youtube Data API to gather data about Youtube channels and videos.
Users input a channel name and then enter a quote from a video on that channel,
this program will return a list of video titles and links for which the closed captioning contained
the user's inputted quote. 
*/

var apiKey = 'AIzaSyAOXoWi4Klu7Lw3-Acqkoovr_qkC0EoU0U';
var videoIdToCaptions = new Map(); //map from videoId to caption string
var channelId;
var videoIdToName = new Map();



window.onload = function(){
    document.getElementById("channelForm").onsubmit = updateChannel;  
    document.getElementById("captionForm").onsubmit = submitQuote;
}



function getTestData(){
    channelId = UCsvn_Po0SmunchJYOWpOxMg; //dunkey
    videoIdToCaptions.set("c66IR3qA5-w", "");  //pikachu video

    //now you just need to get the captions with getCaptions()
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
    
    return false; //don't submit, don't refresh page
}

function submitQuote(){
    var quote = document.getElementById("quoteText").value;
    if(quote){
        document.getElementById("resultsList").innerHTML = "Processing results..."; //clear all nodes to make room for new query
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
        document.getElementById("resultsList").innerHTML = ""; //clear feedback string 
        findVideoDetails(matches);

    } else{
        alert("Please enter a quote");
    }
    return false; //again currently necessary to not refresh page 
}

async function findVideoDetails(matches){
    const storeName = async videoId => {
        var name = await getVideoName(videoId);
        videoIdToName.set(videoId, name);
    }
    const getData = async () => {
        return Promise.all(matches.forEach(videoId => storeName(videoId))); //stores name in map for each videoId
    }
    getData().then(data => {
        data.forEach(videoId => {
            var term = document.createElement("dt");
            term.appendChild(document.createTextNode(videoIdToName.get()));
            document.getElementById("resultsList").appendChild(term);


            var a = document.createElement("a");
            var description = document.createElement("dd");

            var link = `https://www.youtube.com/watch?v=${videoId}`;
            a.textContent = link;
            a.setAttribute('href', link);
            description.appendChild(a);
            document.getElementById("resultsList").appendChild(description);
        })
    });
}



async function fetchJSONResponse(url){
    try{
        const response = await fetch(url);
        console.log(`Done waiting for response`);
        if(response.ok){
            let jsonResponse = await response.json();
            return jsonResponse;
        } else{
            throw new Error('Request Failed!');
        }
    }
    catch (error) {
        alert(error);
    }
}

async function fetchXMLResponse(url){    
    try{
        const response = await fetch(url);
        console.log(`Done waiting for response`);
        if(response.ok){
            const xmlResponse = await response.text();
            let parser = new DOMParser();
            return parser.parseFromString(xmlResponse, "text/xml");
        }
        throw new Error('Request Failed!');
    }
    catch (error) {
        alert(error);
    }
}

async function getVideoName(videoId){
    if(!videoId){
        console.log(`Video ID invalid`);
        return;
    } else if(videoIdToName.get(videoId) !== ""){
        console.log(`Video name already found`);
        return videoIdToName.get(videoId);
    }
    console.log(`Attempting to fetch video details...`);
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`);

    try{
        //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
        //console.log(JSON.stringify(jsonResponse));
        if(jsonResponse.items.length > 0){
            console.log(jsonResponse.items[0].snippet.title);
            return jsonResponse.items[0].snippet.title;
        }
        return jsonResponse.title;
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
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${channelName}&type=channel&fields=items%2Fsnippet%2FchannelId&key=${apiKey}`);
    try{
        //document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
        if(jsonResponse.items.length <= 0){
            alert("No channels found");
            return;
        } else{
            //we can change this to allow users to select from the list of channels
            channelId = jsonResponse.items[0].snippet.channelId;
            console.log(`Channel ID = ${channelId}`);
            getPlaylistId(); //now fetch everything else 
        }
        //if it is not valid (no channels), then it returns {"items":[]}
    }
    catch (error) {
        alert(error);
    }
}

function jsonHasItems(jsonResponse){
    if(jsonResponse.items.length > 0){
        return true;
    }
}

//this function will grab playlist id
async function getPlaylistId(){
    if(!channelId){
        console.log(`Invalid channel ID`);
        return;
    }
    console.log(`Attempting to fetch playlistId of uploads...`);
    const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&key=${apiKey}&part=contentDetails`);
    try{ //store the playlistId full of uploads
        document.getElementById("debug").innerHTML = JSON.stringify(jsonResponse);
        if(jsonResponse.items.length <= 0){
            alert("No playlists found");
            return;
        } else{
            var playlistId = jsonResponse.items[0].contentDetails.relatedPlaylists.uploads;
            console.log(`Playlist ID = ${playlistId}`);
            getVideoIds(playlistId);
        }
    }
    catch (error) {
        alert(error);
    }
}

//get all videoIds 
async function getVideoIds(playlistId) {
    var pageToken = "";
    console.log(`Attempting to fetch videoIds of uploads...`);
    while(true){ //we will break out once we have all the videos - need loop for pageTokens
        console.log(`Iterating for page token =${pageToken}`);
        const jsonResponse = await fetchJSONResponse(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50${pageToken}&playlistId=${playlistId}&key=${apiKey}`);
        try{ //store all videoIds (put it in the map, map it to "");
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
        }
        catch (error) {
            alert(error);
        }
    } //end of getting videoIds

    getCaptions();
}
    
//grab all captions for every video in the stored channel
async function getCaptions(){
    var videoIds = Array.from(videoIdToCaptions.keys());
    console.log(videoIds);
    console.log(`Attempting to fetch captions for each videoId asynchronously...`);
    //get captions
    var asyncCaptionFx = videoIds.map(elem => async () => {
        //get the caption and put it in the map
        console.log(`creating async function for ${elem}`);
        videoIdToCaptions.set(elem, await getCaptionFromURL(`http://video.google.com/timedtext?lang=en&v=${elem}`));
    });
    var asyncCaptionFx = asyncCaptionFx.map(fx => fx()); //start the functions

    await Promise.all(asyncCaptionFx); //wait for all promises to be fulfilled
    console.log(`Done fetching all captions`);
    videoIdToCaptions.forEach((value, key, videoIdToCaptions) => console.log(`value = ${value}, key=${key}`)); //log all pairs
}


//should return the captions as a string
async function getCaptionFromURL(url){
    console.log(`Attempting to fetch captions at ${url}...`);
    try{
        const xmlDoc = await fetchXMLResponse(url);
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