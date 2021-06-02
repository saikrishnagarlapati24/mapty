'use strict';
// prettier-ignore

// import './node_modules/leaflet/dist/leaflet.css';
// import './node_modules/leaflet/dist/leaflet.js';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');


class Workout{
    date = new Date();
    id = (Date.now() +  '').slice(-10); //eases to uniquely identify the object. See what Date.now() returns in google
    // clicks =0 ;

    constructor(coords, dist, dur){
        this.coords = coords; // [lat, lng]
        this.dist = dist; //in km
        this.dur = dur; //in min
    }

    _setDesc(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.desc = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }


    //Added to show a problem with the local storage. The solution is not implemented here(not needed) but taught, written in the notes; watch the video.
    // click(){
    //     this.clicks++;
    // }
}

class Run extends Workout{
    type = 'running';
    constructor(coords, dist, dur, cad){
        super(coords, dist, dur);
        this.cad = cad;
        this.calcpace();
        this._setDesc();
    }
    calcpace(){
        this.pace = this.dur/this.dist;
    }
}


class Cyc extends Workout{
    type = 'cycling';
    constructor(coords, dist, dur, elev){
        super(coords, dist, dur);
        this.elev = elev;
        this.calcspeed();
        this._setDesc();
    }

    calcspeed(){
        this.speed = this.dist/this.dur*60;
    }
}



//APPLICATION ARCHITECTURE
//refactoring the initial code


class App{

    #map; 
    #mapevt;
    #workouts = [];
    #zoomlevel = 13;

    constructor(){
        this._getpos();

        //(this below line added later the below event listeners) Retreiving and rendering the workouts stored in localstorage
        this._getLocalStorage();
        
        //so the event handlers should be here (or maybe in _loadmap() also; basically they should not be in a function which would be called more than once), even though the html element may not exist always
        inputType.addEventListener('change', this._toggleElevationField.bind(this)); //here binding is not necessary as the method doesnot use the this keyword
        form.addEventListener('submit', this._newWorkout.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getpos(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadmap.bind(this), //[this note before adding '.bind(this)'. It is added as a solution to the problem] this function call here is a regular one, but not a method call. So, we get an here #### because this is undefined. Why is this a regular function call? Because it is a callback function and alled by the getcurrentposition function and not by us. SO, callback functions are regular function calls(where did I miss this? In the skipped sections?). And also note that when calling call back functions, we should not pass any parameters and the function itself passes when event occurs, else it would be called immediately
                function(){   
                    alert(`Could not get the correct location`);
                }
            );
        }
    }

    _loadmap(pos){
        const {latitude, longitude} = pos.coords;
        const coords = [latitude, longitude];

        this.#map = L.map('map').setView(coords, this.#zoomlevel);//####
        
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // this._getLocalStorage();//We could have put the whole function call here itself istead of in constructor. Moving just the for loop also would do.
        for(let i=0; i<this.#workouts.length; i++){
            this._renderWorkoutMarker(this.#workouts[i]);
            this._renderWorkoutList(this.#workouts[i]);
        }

        this.#map.on('click', this._showform.bind(this));
    }

    _showform(mape){
        //this is an eventhandler. The this keyword for an eventhandler is simply the DOM element on to which it is attached but not the app object we expected. So, we use bind to solve the problem
        this.#mapevt = mape;
        form.classList.remove('hidden');
        inputDistance.focus();        

        /////////// this._toggleElevationField();(error)
        /////////// this._newWorkout();(error)

        //these two lines being here works wrong, because everytime a click on the map happens, this function gets called and everytime new event listeners are being gnerated. So, every time we submit a new workout we enter form data once, but so many number of event listeners are listening to the same data but only one captures it and remaining all other capture 0's in all input input fields nd throw us alert messages in the written for the validation of input. These alert messages increases with the number of increasing number of clicks on the map beacuse for every click a new event listener is being generated
        //so these two should not be here.
        // inputType.addEventListener('change', this._toggleElevationField.bind(this)); //here binding is not necessary as the method doesnot use the this keyword
        // form.addEventListener('submit', this._newWorkout.bind(this));
    }

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        e.preventDefault();


        const validate = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const posit = (...inputs) => inputs.every(inp => inp>0);

        //Get data from the form
        const type = inputType.value;
        const dist = Number(inputDistance.value);
        const dur = Number(inputDuration.value);
        const {lat, lng} = this.#mapevt.latlng;
        let w;

        //If running, create the running object
        if(type === 'running'){
            const cad = Number(inputCadence.value); //or we can convert the string input to number like below also
            // const cad = +inputCadence.value;
            //Validate the data
            if(!validate(dist, dur, cad) || !posit(dist, dur, cad)){
                return alert('Running inputs have to be positive numbers!');
            } 

            w = new Run([lat, lng], dist, dur, cad);
        }

        //if cycling, create the cycling object
        else if(type === 'cycling'){
            const elev = Number(inputElevation.value);
            //Validate the data
            if(!validate(dist, dur, elev) || !posit(dist, dur)){
                return alert('Cycling inputs have to be positive numbers!');
            } 
            
            w = new Cyc([lat, lng], dist, dur, elev);
        }

        //Add the new object to the workout array
        this.#workouts.push(w);
        // console.log(w);

        //render workout on map as marker
        this._renderWorkoutMarker(w);//no need to use bind here since it is a method call and not an event handler
    
        //render the workout list
        this._renderWorkoutList(w);

        // Hide the form + clear the input fields
        this._hideform();

        //set local storage to all workouts
        this._setLocalStorage();

    }

    _renderWorkoutMarker(w){
        L.marker([...w.coords])
        .addTo(this.#map)
        .bindPopup(L.popup({
            maxwidth: 250, 
            minwidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${w.type}-popup`,
        }))
        .setPopupContent(`${w.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${w.desc}`)
        .openPopup();
    }

    _renderWorkoutList(w){
        const html = `
        <li class="workout workout--${w.type}" data-id="${w.id}">
        <h2 class="workout__title">${w.desc}</h2>
        <div class="workout__details">
          <span class="workout__icon">${w.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
          <span class="workout__value">${w.dist}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${w.dur}</span>
          <span class="workout__unit">min</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${w.type==='running'? w.pace.toFixed(1): w.speed.toFixed(1)}</span>
          <span class="workout__unit">${w.type==='running'? 'min/km': 'km/h'}</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">${w.type==='running'? '🦶🏼': '⛰'}</span>
          <span class="workout__value">${w.type==='running'? w.cad: w.elev}</span>
          <span class="workout__unit">${w.type==='running'? 'spm': 'm'}</span>
        </div>
      </li>
      `;

      form.insertAdjacentHTML('afterend', html);
    }

    _hideform(){
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ' ';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(()=> (form.style.display = 'grid'), 1000);
    }

    _moveToPopup(e){
        const w = e.target.closest('.workout');
        if(!w) return;

        const wkt = this.#workouts.find(work => work.id === w.dataset.id);
        // console.log(wkt);

        // this.#map = L.map('map').setView(wkt.coords, 13);//error
        this.#map.setView(wkt.coords, this.#zoomlevel, {//options for animation(read the documentation of leaflet)
            animate: true,
            pan:{
                duration: 1,//in seconds
            }
        });

        // wkt.click();//This is added to show a problem with the localstorage
    }

    _setLocalStorage(){
        localStorage.setItem('warray', JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('warray'));
        // console.log(data);
        if(data)//is not 'null'; else we get error in 112 line since then workouts will not be an array object with 0 elmts but point to null.
        this.#workouts = data;
        // for(let i =0; i<data.length; i++){
        //     this._renderWorkoutMarker(data[i]);
        //     this._renderWorkoutList(data[i]);
        // }
    }

    reset(){//A public Interface(no underscore). Should be called from console if we want to clear the localstorage
        localStorage.removeItem('warray');
        location.reload();//location is a big object that contains a lot of props and meths in the browser
    }
}


const app = new App();










//before refactoring
// if(navigator.geolocation){

    // // let map, mapevt;//for scoping all over the block
    // navigator.geolocation.getCurrentPosition(//this is a function
    //     function(pos){//if fetching geolocation is success. The argument to the function is automatically passed by the javascript on event
    //         // console.log(pos);
    //         const {latitude, longitude} = pos.coords;
    //         // console.log(`https://www.google.com/maps/@${latitude},${longitude},15z`);
    //         const coords = [latitude, longitude];

    //         //leaflet code for rendering the map on the current location
    //         map = L.map('map').setView(coords, 13);
    //         // console.log(map);
    //         L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {//map is formed as a combination of boxes. This is the code about where to get the boxes(basically the whole map) from
    //             attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    //         }).addTo(map);

    //         // L.marker(coords)//for adding the marker*****
    //         // .addTo(map)
    //         // .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
    //         // .openPopup();

    //         //written by me for modifying the marker(for improving this*****) and handling click event
    //         map.on('click', function(mape){//an event listener on map so that we can access exact coords of clicking but not the entre map. It is not a javascript method but developed by leaflet library
    //             mapevt = mape;
    //             form.classList.remove('hidden');
    //             inputDistance.focus();


    //             // console.log(mapevt);
    //             // const {lat, lng} = mapevt.latlng;

    //             // L.marker([lat, lng])
    //             // .addTo(map)
    //             // // .bindPopup('The workout')
    //             // .bindPopup(L.popup({//styling of popup//https://leafletjs.com/reference-1.7.1.html#marker
    //             //     maxwidth: 250,
    //             //     minwidth: 100,
    //             //     autoclose: false,
    //             //     closeOnClick: false,
    //             //     className: 'running-popup',
    //             // }))
    //             // .setPopupContent('Workout')
    //             // .openPopup();

    //         });
    //     },

    //     function(){//if fetching location is a failure
    //         alert(`Could not get the correct location`);
    //     }
    // );

    // form.addEventListener('submit', function(e){//we can't click on form before the hidden class is removed from it(i.e not before the function for successful rendering is finished executing)
    //     //The default behaviour of forms is to reload the page when sub,itted. So, after the page loaded and we click somewhere, the form appears and then when we submit by pressing enter, this function executes and the popup also appears according to the below code. But very soon the page reloads and goes to the initial stage.
    //     // so to avoid this default behavior, 
    //     e.preventDefault();
    //     inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = ' ';// is it not the text content? Is it just plain '=' ?(changed)
    //     // console.log(mapevt);
    //     const {lat, lng} = mapevt.latlng;

    //     L.marker([lat, lng])
    //     .addTo(map)
    //     .bindPopup(L.popup({
    //         maxwidth: 250,
    //         minwidth: 100,
    //         autoclose: false,
    //         closeOnClick: false,
    //         className: 'running-popup',
    //     }))
    //     .setPopupContent('Workout')
    //     .openPopup();
    // })
// };

// inputType.addEventListener('change', function(){
//     // inputElevation.classList.toggle('form__row--hidden');
//     // inputCadence.classList.toggle('form__row--hidden');
//     inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
//     inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
// });
