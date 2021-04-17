let websocket = new WebSocket("ws://192.168.0.234:6455");

let lim_time = 0;
let lim_state = false;

let stepper = 0;

let vertical_mouse_down = false;
let horizontal_mouse_down = false;
let current_vertical_touch = null;
let current_horizontal_touch = null;

let ultrasonic_mouse_down = false;
let infrared_mouse_down = false;
let current_ultrasonic_touch = null;
let current_infrared_touch = null;

let last_time = -100000000;
let last_update_time = 0;
let gyro_pos = [0, 0, 0];
let accel_speeds = [0, 0, 0];
let accel_pos = [0, 0, 0];

let drive = [0, 0];

let last_20_readings_iter = 0;
let last_20_readings = [];
for (let i = 0; i < 20; i++) {
    last_20_readings[i] = [];
}

function to_6_substr(n, rnd) {
    let num = round(n, rnd);
    return n < 0 ? "-" + (-num.toString().substr(0, 6)) : "+" + num.toString().substr(0, 5);
}

function g_to_cms2(num) {
    return num * 980;
}

function median(numbers) {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function round(num, dist) {
    return Math.round(num / dist) * dist;
}

function partial_round(num, dist) {
    if (Math.abs(num) < dist) {
        return 0;
    } else {
        return num;
    }
}

function drawInfraredCanvas(infraredCanvas, x, y) {
    let infrared2 = document.getElementById("infrared2");
    document.getElementById("infrared1").innerText = x;
    infrared2.innerText = y;
    infrared2.style.top = "calc(50% + " + x + "px)";
    infraredCanvas.fillStyle = "white";
    infraredCanvas.fillRect(0, 0, 200, 200);
    infraredCanvas.fillStyle = "blue";
    infraredCanvas.strokeStyle = "black";
    infraredCanvas.fillRect(90, 0, 20, 200);
    infraredCanvas.strokeRect(90, 0, 20, 200);
    infraredCanvas.fillRect(0, 90 + x, 200, 20);
    infraredCanvas.strokeRect(0, 90 + x, 200, 20);
    infraredCanvas.fillStyle = "black";
    infraredCanvas.fillRect(90 + y, 90 + x, 20, 20);
}

function drawUltrasonicCanvas(ultrasonicCanvas, x, y) {
    let ultrasonic2 = document.getElementById("ultrasonic2");
    document.getElementById("ultrasonic1").innerText = x;
    ultrasonic2.innerText = y;
    ultrasonic2.style.left = "calc(50% + " + x + "px)";
    ultrasonicCanvas.fillStyle = "white";
    ultrasonicCanvas.fillRect(0, 0, 200, 200);
    ultrasonicCanvas.fillStyle = "blue";
    ultrasonicCanvas.strokeStyle = "black";
    ultrasonicCanvas.fillRect(0, 90, 200, 20);
    ultrasonicCanvas.strokeRect(0, 90, 200, 20);
    ultrasonicCanvas.fillRect(90 + x, 0, 20, 200);
    ultrasonicCanvas.strokeRect(90 + x, 0, 20, 200);
    ultrasonicCanvas.fillStyle = "black";
    ultrasonicCanvas.fillRect(90 + x, 90 + y, 20, 20);
}
let ultrasonicCvs = document.getElementById("ultrasonicCanvas");
let infraredCvs = document.getElementById("infraredCanvas");
let ultrasonicCell = document.getElementById("ultrasonicCell");
let infraredCell = document.getElementById("infraredCell");

function passInfraredCanvas(e, update) {
    if (!lim_state) {
        let x = Math.round(clamp(e.clientX - infraredCvs.getBoundingClientRect().left - 100, -90, 90));
        let y = Math.round(clamp(e.clientY - infraredCvs.getBoundingClientRect().top - 100, -90, 90));
        if (update) {
            updatePos(y, "infrared", 0);
            updatePos(x, "infrared", 1);
        }
        drawInfraredCanvas(infraredCvs.getContext("2d"), y, x);
    }
}
function passUltrasonicCanvas(e, update) {
    document.getElementById('limSlider1').innerText = e.clientX;
    if (!lim_state) {
        let x = Math.round(clamp(e.clientX - ultrasonicCvs.getBoundingClientRect().left - 100, -90, 90));
        let y = Math.round(clamp(e.clientY - ultrasonicCvs.getBoundingClientRect().top - 100, -90, 90));
        if (update) {
            updatePos(x, "ultrasonic", 0);
            updatePos(y, "ultrasonic", 1);
        }
        drawUltrasonicCanvas(ultrasonicCvs.getContext("2d"), x, y);
    }
}

ultrasonicCell.addEventListener('mousedown', e => {
    ultrasonic_mouse_down = true;
    passUltrasonicCanvas(e, false)
});
infraredCell.addEventListener('mousedown', e => {
    infrared_mouse_down = true;
    passInfraredCanvas(e, false);
});
ultrasonicCell.addEventListener('touchstart', e => {
    if (e.targetTouches.length >= 1) {
        touch = e.targetTouches.item(0);
        passUltrasonicCanvas(touch, false);
        current_ultrasonic_touch = touch.identifier;
    }
});
infraredCell.addEventListener('touchstart', e => {
    if (e.targetTouches.length >= 1) {
        touch = e.targetTouches.item(0);
        passInfraredCanvas(touch, false);
        current_infrared_touch = touch.identifier;
    }
});

ultrasonicCell.addEventListener('mousemove', e => {
    if (ultrasonic_mouse_down) {
        passUltrasonicCanvas(e, false);
    }
});
infraredCell.addEventListener('mousemove', e => {
    if (infrared_mouse_down) {
        passInfraredCanvas(e, false);
    }
});
ultrasonicCell.addEventListener('touchmove', e => {
    if (current_ultrasonic_touch != null) {
        let touch = null;
        for (let i = 0; i < e.targetTouches.length; i++) {
            if (e.targetTouches.item(i).identifier == current_ultrasonic_touch) {
                touch = e.targetTouches.item(i);
            }
        }
        if (touch != null) {
            passUltrasonicCanvas(touch, false);
        }
    }
});
infraredCell.addEventListener('touchmove', e => {
    if (current_infrared_touch != null) {
        let touch = null;
        for (let i = 0; i < e.targetTouches.length; i++) {
            if (e.targetTouches.item(i).identifier == current_infrared_touch) {
                touch = e.targetTouches.item(i);
            }
        }
        if (touch != null) {
            passInfraredCanvas(touch, false);
        }
    }
});

drawUltrasonicCanvas(document.getElementById("ultrasonicCanvas").getContext("2d"), 0, 0);
drawInfraredCanvas(document.getElementById("infraredCanvas").getContext("2d"), 0, 0);


websocket.onmessage = function (event) {
    let data = JSON.parse(event.data);
    switch (data.response) {
        case "servos":
            if (data.pin == 10) {
                if (lim_state) {
                    drawUltrasonicCanvas(document.getElementById("ultrasonicCanvas").getContext("2d"), data.positions[0], data.positions[1]);
                }
            } else if (data.pin == 11) {
                if (lim_state) {
                    drawInfraredCanvas(document.getElementById("infraredCanvas").getContext("2d"), data.positions[0], data.positions[1]);
                }
            }
            break;
        case "stepper":
            break;
        case "infrared":
            document.getElementById("infrared").style.backgroundColor = data.infrared == true ? "red" : "lightskyblue";
            break;
        case "motor":
            break;
        case "ultrasonic":
            document.getElementById("ultrasonic").innerText = clamp(Math.round(data.ultrasonic), 0, 150);
            break;
        case "gyroscope":
            data.gyroscope[1] = -data.gyroscope[1];
            if (last_time == 0) {
                last_time = data.time;
            }
            let updateArray = JSON.parse(JSON.stringify(data.gyroscope));
            if (last_20_readings_iter > 19) {
                let time_secs = (data.time - last_time) / 1000000000;
                let medians = [];
                for (let i = 0; i < 6; i++) {
                    let medianArray = [];
                    for (let j = 0; j < 20; j++) {
                        medianArray[j] = last_20_readings[j][i];
                    }
                    medians[i] = median(medianArray);
                    if (Math.abs(data.gyroscope[i] - medians[i]) > (i > 2 ? 5 : 20)) {
                        updateArray[i] = last_20_readings[last_20_readings_iter % 20][i];
                    }
                }
                for (let i = 0; i < 3; i++) {
                    gyro_pos[i] += partial_round(data.gyroscope[3 + i] - medians[3 + i], 5) * time_secs;
                }
                for (let i = 0; i < 3; i++) {
                    accel_speeds[i] += partial_round(g_to_cms2(data.gyroscope[i] - medians[i]), 20) * time_secs;
                }
                for (let i = 0; i < 3; i++) {
                    if (Math.abs(data.gyroscope[3 + i] - medians[3 + i]) > 0.2) {
                        break;
                    }
                    if (i == 2) {
                        for (let j = 0; j < 3; j++) {
                            if (j != 1 || (drive[0] == 0)) {
                                accel_speeds[j] = 0;
                            }
                        }
                    }
                }
                if (last_update_time + 100000000 < data.time) {
                    last_update_time = data.time;
                    for (let i = 0; i < 3; i++) {
                        document.getElementById("gyropos" + i).innerText = to_6_substr(gyro_pos[i], 1);
                        document.getElementById("accelspeed" + i).innerText = to_6_substr(accel_speeds[i], 1);
                    }
                    document.getElementById("gyrospeed0").innerText = to_6_substr(data.gyroscope[3] - medians[3], 5);
                    document.getElementById("gyrospeed1").innerText = to_6_substr(data.gyroscope[4] - medians[4], 5);
                    document.getElementById("gyrospeed2").innerText = to_6_substr(data.gyroscope[5] - medians[5], 5);
                    document.getElementById("accel0").innerText = to_6_substr(g_to_cms2(data.gyroscope[0] - medians[0]), 10);
                    document.getElementById("accel1").innerText = to_6_substr(g_to_cms2(data.gyroscope[1] - medians[1]), 10);
                    document.getElementById("accel2").innerText = to_6_substr(g_to_cms2(data.gyroscope[2] - medians[2]), 10);
                }
            }
            last_20_readings[last_20_readings_iter % 20] = updateArray;
            last_20_readings_iter++;
            if (last_20_readings_iter == 40) {
                last_20_readings_iter -= 20;
            }
            last_time = data.time;
            break;
    }
}

let limSlider = document.getElementById("limSlider");
let limSlider3 = document.getElementById("limSlider3");

function setLimFalse() {
    lim_state = false;
    limSlider.style.backgroundColor = "rgb(68, 194, 51)";
    limSlider.style.borderColor = "rgb(68, 194, 51)";
    limSlider3.style.left = "0%";
    limSlider1.innerText = "";
    limSlider2.innerText = "lim";
    limSlider3.innerText = "fixed";
    updateLim();
}

function setLimTrue() {
    lim_state = true;
    limSlider.style.backgroundColor = "gray";
    limSlider.style.borderColor = "gray";
    limSlider3.style.left = "50%";
    limSlider1.innerText = "fixed";
    limSlider2.innerText = "";
    limSlider3.innerText = "lim";
    updateLim();
}

let limHandler = e => {
    if(new Date() / 1000 > lim_time + 0.5) {
        lim_time = new Date() / 1000;
        if (lim_state) {
            setLimFalse();
        } else {
            setLimTrue();
        }
    }
}
limSlider.addEventListener('mousedown', limHandler);
limSlider.addEventListener('touchstart', limHandler);

let up = e => {
    vertical_mouse_down = false;
    horizontal_mouse_down = false;
    if (ultrasonic_mouse_down) {
        passUltrasonicCanvas(e, true);
        ultrasonic_mouse_down = false;
    }
    if (infrared_mouse_down) {
        passInfraredCanvas(e, true);
        infrared_mouse_down = false;
    }
};
window.addEventListener('mouseup', up);
window.addEventListener('touchend', e => {
    let new_vertical_touch = null;
    let new_horizontal_touch = null;
    let new_ultrasonic_touch = null;
    let new_infrared_touch = null;
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches.item(i).identifier == current_vertical_touch) {
            new_vertical_touch = current_vertical_touch;
        }
        if (e.touches.item(i).identifier == current_horizontal_touch) {
            new_horizontal_touch = current_horizontal_touch;
        }
        if (e.touches.item(i).identifier == current_ultrasonic_touch) {
            new_ultrasonic_touch = current_ultrasonic_touch;
        }
        if (e.touches.item(i).identifier == current_infrared_touch) {
            new_infrared_touch = current_infrared_touch;
        }
    }
    current_vertical_touch = new_vertical_touch;
    current_horizontal_touch = new_horizontal_touch;
    if (new_ultrasonic_touch == null && current_ultrasonic_touch != null) {
        let e = {
            clientX: Number.parseInt(document.getElementById("ultrasonic1").innerText) + ultrasonicCvs.getBoundingClientRect().left + 100,
            clientY: Number.parseInt(document.getElementById("ultrasonic2").innerText) + ultrasonicCvs.getBoundingClientRect().top + 100,
        }
        passUltrasonicCanvas(e, true);
        current_ultrasonic_touch = new_ultrasonic_touch;
    }
    if (new_infrared_touch == null && current_infrared_touch != null) {
        let e = {
            clientX: Number.parseInt(document.getElementById("infrared2").innerText) + infraredCvs.getBoundingClientRect().left + 100,
            clientY: Number.parseInt(document.getElementById("infrared1").innerText) + infraredCvs.getBoundingClientRect().top + 100,
        }
        passInfraredCanvas(e, true);
        current_infrared_touch = new_infrared_touch;
    }
});
window.addEventListener('touchmove', e => { e.preventDefault(); }, { passive: false });

function clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
}

function range_to_range(number) {
    return pad(Math.ceil(number * 2.55).toString(16));
}

function pad(num) {
    if (num.length == 1) {
        return "0" + num;
    } else {
        return num;
    }
}

function get_colour(value) {
    if (value < -50) {
        return "ff00" + range_to_range(100 + (100 + value) * (100 + value) / 50 + value);
    } else if (value < 0) {
        return range_to_range(50 - (value + 50) * (value + 50) / 50 - value) + "00ff";
    } else if (value < 50) {
        return "00" + range_to_range(50 - (value - 50) * (value - 50) / 50 + value) + "ff";
    } else {
        return "00ff" + range_to_range(100 + (100 - value) * (100 - value) / 50 - value);
    }
}

function map_pixels_to_value(i) {
    let adjusted_i = i > 100 ? Math.ceil((i - 9.9) / 10) : Math.floor((i + 9.9) / 10);
    return clamp(adjusted_i * 10 - 100, -100, 100);
}

function updateHorizontalSlider(x) {
    drive[1] = map_pixels_to_value(x);
    updateMotorTable();
}

function updateVerticalSlider(y) {
    drive[0] = -map_pixels_to_value(y);
    updateMotorTable();
}

function updateMotorTable() {
    let left = Math.ceil(clamp(drive[0] + Math.sign(drive[1]) * (drive[1] * drive[1]) / 200 + 0.5 * drive[1], -100, 100));
    let right = Math.ceil(clamp(drive[0] - Math.sign(drive[1]) * (drive[1] * drive[1]) / 200 - 0.5 * drive[1], -100, 100));
    document.getElementById("drive").innerText = "Drive: " + drive[0];
    document.getElementById("turn").innerText = "Turn: " + drive[1];
    document.getElementById("left").innerText = "L: " + left;
    document.getElementById("right").innerText = "R: " + right;
    let vs = document.getElementById("verticalSlider");
    let hs = document.getElementById("horizontalSlider");
    let vc = vs.getContext("2d");
    let hc = hs.getContext("2d");
    vc.fillStyle = "#" + get_colour(drive[0]);
    hc.fillStyle = "#" + get_colour(drive[1]);
    vc.fillRect(0, 0, 40, 200);
    hc.fillRect(0, 0, 200, 40);
    vc.fillStyle = "#000000";
    hc.fillStyle = "#000000";
    vc.fillRect(0, clamp(-drive[0] + 98, 0, 196), 40, 4);
    hc.fillRect(clamp(drive[1] + 98, 0, 196), 0, 4, 40);
    updateMotor(left, right);
}
let vertical_slider = document.getElementById("verticalSliderCell");
let actual_vertical_slider = document.getElementById("verticalSlider");
let horizontal_slider = document.getElementById("horizontalSliderCell");
let actual_horizontal_slider = document.getElementById("horizontalSlider");
vertical_slider.addEventListener('mousedown', e => {
    vertical_mouse_down = true;
    updateVerticalSlider(e.clientY - actual_vertical_slider.getBoundingClientRect().top);
});
vertical_slider.addEventListener('touchstart', e => {
    if (e.targetTouches.length >= 1) {
        touch = e.targetTouches.item(0);
        updateVerticalSlider(touch.clientY - actual_vertical_slider.getBoundingClientRect().top);
        current_vertical_touch = touch.identifier;
    }
});
["gyropos", "accelspeed"].forEach(n => {
    for (let i = 0; i < 3; i++) {
        let resetListener = e => {
            switch (n) {
                case "gyropos":
                    gyro_pos[i] = 0;
                    break;
                case "accelspeed":
                    accel_speeds[i] = 0;
                    break;
            }
        };
        let element = document.getElementById(n + i);
        element.addEventListener('mousedown', resetListener);
        element.addEventListener('touchstart', resetListener);
    }
    let resetAllListener = e => {
        for (let i = 0; i < 3; i++) {
            switch (n) {
                case "gyropos":
                    gyro_pos[i] = 0;
                    break;
                case "accelspeed":
                    accel_speeds[i] = 0;
                    break;
            }
        }
    }
    let element = document.getElementById(n);
    element.addEventListener('mousedown', resetAllListener);
    element.addEventListener('touchstart', resetAllListener);
});

vertical_slider.addEventListener('mousemove', e => {
    if (vertical_mouse_down) {
        updateVerticalSlider(e.clientY - actual_vertical_slider.getBoundingClientRect().top);
    }
});
vertical_slider.addEventListener('touchmove', e => {
    if (current_vertical_touch != null) {
        let touch = null;
        for (let i = 0; i < e.targetTouches.length; i++) {
            if (e.targetTouches.item(i).identifier == current_vertical_touch) {
                touch = e.targetTouches.item(i);
            }
        }
        if (touch != null) {
            updateVerticalSlider(touch.clientY - actual_vertical_slider.getBoundingClientRect().top);
        }
    }
});


horizontal_slider.addEventListener('mousedown', e => {
    horizontal_mouse_down = true;
    updateHorizontalSlider(e.clientX - actual_horizontal_slider.getBoundingClientRect().left);
});
horizontal_slider.addEventListener('touchstart', e => {
    if (e.targetTouches.length >= 1) {
        touch = e.targetTouches.item(0);
        updateHorizontalSlider(touch.clientX - actual_horizontal_slider.getBoundingClientRect().left);
        current_horizontal_touch = touch.identifier;
    }
});

horizontal_slider.addEventListener('mousemove', e => {
    if (horizontal_mouse_down) {
        updateHorizontalSlider(e.clientX - actual_horizontal_slider.getBoundingClientRect().left);
    }
});
horizontal_slider.addEventListener('touchmove', e => {
    if (current_horizontal_touch != null) {
        let touch = null;
        for (let i = 0; i < e.targetTouches.length; i++) {
            if (e.targetTouches.item(i).identifier == current_horizontal_touch) {
                touch = e.targetTouches.item(i);
            }
        }
        if (touch != null) {
            updateHorizontalSlider(touch.clientX - actual_horizontal_slider.getBoundingClientRect().left);
        }
    }
});

function updateLim() {
    ["infrared", "ultrasonic"].forEach(chain => {
        [0, 1].forEach(module => {
            let msg = {
                request: "servo",
                chain: chain,
                function: "lim",
                module: module,
                data: lim_state
            }
            websocket.send(JSON.stringify(msg));
        });
    });
}

function updateStepper(direction) {
    let msg = {
        request: "stepper",
        direction: direction
    };
    websocket.send(JSON.stringify(msg));
}

function updateMotor(l, r) {
    let msg = {
        drive: [l, r],
        request: "motor"
    }
    websocket.send(JSON.stringify(msg));
}

function updateColour(r, g, b, chain, module) {
    let msg = {
        function: "colour",
        request: "servo",
        chain: chain,
        module: module,
        data: [r, g, b]
    }
    websocket.send(JSON.stringify(msg));
}

function updatePos(pos, chain, module) {
    let msg = {
        function: "pos",
        request: "servo",
        chain: chain,
        module: module,
        data: pos
    }
    websocket.send(JSON.stringify(msg));
}

websocket.onopen = e => {
    updateMotorTable();
    let ultrasonicRangingCanvas = document.getElementById("ultrasonicRangerCanvas").getContext("2d");
    ultrasonicRangingCanvas.strokeStyle = "black";
    ultrasonicRangingCanvas.beginPath();
    ultrasonicRangingCanvas.arc(150, 150, 150, 0, 2 * Math.PI);
    ultrasonicRangingCanvas.stroke();
};
