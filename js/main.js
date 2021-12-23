let websocket = new WebSocket("ws://192.168.0.234:6455");

let previousUltrasonicRange = 0;
let lastReadings = [];

let vertical_mouse_down = false;
let horizontal_mouse_down = false;
let current_vertical_touch = null;
let current_horizontal_touch = null;

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

websocket.onmessage = function (event) {
    let data = JSON.parse(event.data);
    switch (data.response) {
        case "motor":
            break;
        case "camera":
            document.getElementById("cameraImg").src = 'data:image/jpg;base64,' + data.image;
        case "ultrasonic":
            let ultrasonicNow = clamp(Math.round(data.ultrasonic), 0, 150);
            document.getElementById("ultrasonic").innerText = ultrasonicNow;
            lastReadings.push([data.time, ultrasonicNow]);
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


let up = e => {
    vertical_mouse_down = false;
    horizontal_mouse_down = false;
};
window.addEventListener('mouseup', up);
window.addEventListener('touchend', e => {
    let new_vertical_touch = null;
    let new_horizontal_touch = null;
    for (let i = 0; i < e.touches.length; i++) {
        if (e.touches.item(i).identifier == current_vertical_touch) {
            new_vertical_touch = current_vertical_touch;
        }
        if (e.touches.item(i).identifier == current_horizontal_touch) {
            new_horizontal_touch = current_horizontal_touch;
        }
    }
    current_vertical_touch = new_vertical_touch;
    current_horizontal_touch = new_horizontal_touch;
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

document.addEventListener("keydown", e => {
    if (e.key == "ArrowLeft") { 
        drive[1] = clamp(drive[1] - 10, -100, 100);
    } else if (e.key == "ArrowUp") { 
        drive[0] = clamp(drive[0] + 10, -100, 100);
    } else if (e.key == "ArrowRight") { 
        drive[1] = clamp(drive[1] + 10, -100, 100);
    } else if (e.key == "ArrowDown") {
        drive[0] = clamp(drive[0] - 10, -100, 100);
    } else {
        return;
    }
    updateMotorTable();
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

function updateMotor(l, r) {
    let msg = {
        drive: [l, r],
        request: "motor"
    }
    websocket.send(JSON.stringify(msg));
}

websocket.onopen = e => {
    updateMotorTable();
};

