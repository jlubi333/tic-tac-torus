(function() {
    //
    // Utility Functions
    //

    // Source: http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
    function escapeRegExp(str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }
    function replaceAll(str, find, replace) {
        return str.replace(new RegExp(escapeRegExp(find), "g"), replace);
    }

    function firebaseSanitize(s) {
        s = replaceAll(s, ".", "");
        s = replaceAll(s, "#", "");
        s = replaceAll(s, "\$", "");
        s = replaceAll(s, "[", "");
        s = replaceAll(s, "]", "");
        if (s.length === 0) {
            s = " ";
        }
        return s;
    }

    //
    // Constants
    //

    var NONE = 0;
    var X = 1;
    var O = -1;

    var BLANK_BOARD = [NONE, NONE, NONE,
                       NONE, NONE, NONE,
                       NONE, NONE, NONE];

    //
    // Output Element Globals
    //

    var oegGameTypes;
    function updateOEGGameTypes(s) {
        for (var i = 0; i < oegGameTypes.length; i++) {
            oegGameTypes[i].innerHTML = s;
        }
    }

    //
    // Player Management
    //

    function nextPlayer(p) {
        if (p === X) {
            return O;
        } else {
            return X;
        }
    }

    //
    // Determining Winner
    //

    function allEqual(xs) {
        for (var i = 1; i < xs.length; i++) {
            if (xs[i] !== xs[0]) {
                return false;
            }
        }
        return true;
    }

    function determineWinner(board, gameType) {
        var winFunc;

        var regularWinFunc = function(b, p) {
            // Rows
            if (   allEqual([p, b[0], b[1], b[2]])
                || allEqual([p, b[3], b[4], b[5]])
                || allEqual([p, b[6], b[7], b[8]])) {
                return true;
            }
            // Columns
            if (   allEqual([p, b[0], b[3], b[6]])
                || allEqual([p, b[1], b[4], b[7]])
                || allEqual([p, b[2], b[5], b[8]])) {
                return true;
            }
            // Diagonals
            if (   allEqual([p, b[0], b[4], b[8]])
                || allEqual([p, b[2], b[4], b[6]])) {
                return true;
            }
            return false;
        }

        var torusWinFunc = function(b, p) {
            // Normal Tic-Tac-Toe
            if (regularWinFunc(b, p)) {
                return true;
            }
            // Fancy Corners
            if (   allEqual([p, b[0], b[5], b[7]])
                || allEqual([p, b[2], b[3], b[7]])
                || allEqual([p, b[6], b[1], b[5]])
                || allEqual([p, b[8], b[1], b[3]])) {
                return true;
            }
            return false;
        }

        var kleinWinFunc = function(b, p) {
            // Normal Tic-Tac-Toe
            if (regularWinFunc(b, p)) {
                return true;
            }
            // TODO Klein
            return false;
        }

        if (gameType === "regular") {
            winFunc = regularWinFunc;
        } else if (gameType === "torus") {
            winFunc = torusWinFunc;
        } else if (gameType === "klein") {
            winFunc = kleinWinFunc;
        } else {
            alert("Error in determining winner.");
            return X;
        }

        if (winFunc(board, X)) {
            return X;
        } else if(winFunc(board, O)) {
            return O;
        } else {
            return NONE;
        }
    }

    //
    // Board Management
    //

    function allowMove(roomRef, me, board, boxes) {
        for (var i = 0; i < boxes.length; i++) {
            (function(index) {
                boxes[index].onclick = function(event) {
                    if (board[index] !== NONE) {
                        alert("That spot is already taken.");
                    } else {
                        board[index] = me;
                        roomRef.update({"board": board, "currentPlayer": nextPlayer(me)});
                    }
                }
            })(i);
        }
    }

    function disallowMove(boxes) {
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].onclick = "";
        }
    }

    function setBoard(boxes, board) {
        console.log(board);
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].dataset.placeValue = board[i];
        }
    }

    //
    // Room Management
    //

    function createRoom(rootDataRef, roomName, gameType, startingPlayer, boxes, roomExistsError) {
        var roomRef = rootDataRef.child(roomName);
        roomRef.once("value", function(dataSnapshot) {
            var val = dataSnapshot.val();
            if (val !== null) {
                roomExistsError();
            } else {
                roomRef.set({
                    "full": false,
                    "gameType": gameType,
                    "currentPlayer": startingPlayer,
                    "board": BLANK_BOARD
                });
                runGame(roomRef, X, boxes);
            }
        });
        return roomRef;
    }

    function joinRoom(rootDataRef, roomName, boxes, roomDoesNotExistError) {
        var roomRef = rootDataRef.child(roomName);
        roomRef.once("value", function(dataSnapshot) {
            var val = dataSnapshot.val();
            if (val === null) {
                roomDoesNotExistError();
            } else {
                roomRef.update({
                    "full": true
                });
                runGame(roomRef, O, boxes);
            }
        });
        return roomRef;
    }

    //
    // Game Management
    //

    function runGame(roomRef, me, boxes) {
        roomRef.on("value", function(dataSnapshot) {
            var val = dataSnapshot.val();
            var full = val["full"];
            var gameType = val["gameType"];
            var currentPlayer = val["currentPlayer"];
            var board = val["board"];

            updateOEGGameTypes(gameType);
            setBoard(boxes, board);

            var winner = determineWinner(board, gameType);
            if (winner !== NONE) {
                if (winner === me) {
                    alert("You win!");
                } else {
                    alert("You lose...");
                }
                window.location.reload();
            } else {
                if (full && currentPlayer === me) {
                    allowMove(roomRef, me, board, boxes);
                } else {
                    disallowMove(boxes);
                }
            }
        });
    }

    //
    // Main
    //

    window.onload = function() {
        oegGameTypes = document.getElementsByClassName("game-type");

        var rootDataRef = new Firebase("https://jpl-tic-tac-torus.firebaseio.com/");

        var roomNameInput = document.getElementById("room-name-input");
        var gameTypeInput = document.getElementById("game-type-input");
        var createRoomButton = document.getElementById("create-room-button");

        var availableRooms = document.getElementById("available-rooms");
        var joinRoomButton = document.getElementById("join-room-button");

        var boxes = document.getElementsByClassName("box");

        // Get list of rooms
        rootDataRef.on("value", function(dataSnapshot) {
            availableRooms.disabled = false;
            availableRooms.innerHTML = "";
            var empty = true;
            dataSnapshot.forEach(function(childSnapshot) {
                var val = childSnapshot.val();
                var roomName = childSnapshot.key();
                var full = val["full"];
                if (!full) {
                    var option = document.createElement("option");
                    option.innerHTML = roomName;
                    option.value = roomName;
                    availableRooms.appendChild(option);
                    empty = false;
                }
            });
            if (empty) {
                availableRooms.innerHTML = "<option>No Available Rooms</option>";
                availableRooms.disabled = true;
            }
        });

        // Create Room
        createRoomButton.onclick = function(event) {
            var roomName = firebaseSanitize(roomNameInput.value);
            var gameType = gameTypeInput.options[gameTypeInput.selectedIndex].value;
            createRoom(rootDataRef,
                       roomName,
                       gameType,
                       X,
                       boxes,
                       function() {
                           alert("The room \"" + roomName + "\" already exists.");
                       }
            );
        }

        // Join Room
        joinRoomButton.onclick = function(event) {
            var roomName = availableRooms.options[availableRooms.selectedIndex].value;
            joinRoom(rootDataRef, roomName, boxes, function() {
               alert("The room \"" + roomName + "\" does not exist.");
            });
        }
    };
})();
