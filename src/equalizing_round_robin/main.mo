import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Crypto "mo:base/Crypto";
import Debug "mo:base/Debug";
import Float "mo:base/Float";
import Hash "mo:base/Hash";
import HashMap "mo:base/HashMap";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import Random "mo:base/Random";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Text "mo:base/Text";
import Option "mo:base/Option";

actor class EqualizingRoundRobinContract() {
    // Types
    type Participant = {
        id: Principal;
        internetId: Text;
        signature: ?Blob;
        signatureHash: ?Text;
        timestamp: ?Int;
    };

    type ContractState = {
        #Draft;
        #Active;
        #Completed;
        #Terminated;
    };

    type ContractMetadata = {
        title: Text;
        description: Text;
        contentHash: Text;
        version: Nat;
    };

    type SecurityLog = {
        timestamp: Int;
        action: Text;
        principal: Principal;
        details: Text;
    };

    // State variables
    private stable var contractState: ContractState = #Draft;
    private stable var contractContent: Text = "";
    private stable var contractMetadata: ContractMetadata = {
        title = "";
        description = "";
        contentHash = "";
        version = 1;
    };
    private stable var requiredParticipants: Nat = 0;
    private stable var creationTimestamp: Int = 0;
    private stable var owner: Principal = Principal.fromText("aaaaa-aa");
    private stable var randomSeed: Blob = "\00" : Blob;

    // Admin and participant management
    private let participants = HashMap.HashMap<Principal, Participant>(
        10, Principal.equal, Principal.hash
    );
    private let securityLogs = Buffer.Buffer<SecurityLog>(100);

    // Initialization
    public shared({ caller }) func initializeContract(
        content: Text,
        title: Text,
        description: Text,
        required: Nat
    ): async Result.Result<Text, Text> {
        if (contractState != #Draft) return #err("Contract already initialized.");
        if (required < 2) return #err("Minimum of 2 participants required.");

        contractContent := content;
        contractMetadata := {
            title = title;
            description = description;
            contentHash = Text.fromUtf8(Crypto.hashBlob(#sha256, Text.encodeUtf8(content)));
            version = 1;
        };
        requiredParticipants := required;
        creationTimestamp := Time.now();
        owner := caller;

        randomSeed := await Random.blob();
        contractState := #Active;

        #ok("Contract initialized successfully.");
    };

    // Lightweight initialization
    public shared({ caller }) func initializeSimple(content: Text, required: Nat): async Text {
        contractContent := content;
        requiredParticipants := required;
        contractState := #Active;
        owner := caller;
        "Simple contract initialized."
    };

    // Participant management
    public shared({ caller }) func addParticipant(internetId: Text): async Result.Result<Text, Text> {
        if (contractState != #Active) return #err("Contract not active.");
        if (participants.size() >= requiredParticipants) return #err("Participant limit reached.");
        if (participants.containsKey(caller)) return #err("Participant already added.");

        participants.put(caller, {
            id = caller;
            internetId = internetId;
            signature = null;
            signatureHash = null;
            timestamp = null;
        });

        #ok("Participant added successfully.");
    };

    // Signing
    public shared({ caller }) func sign(signature: Blob): async Result.Result<Text, Text> {
        switch (participants.get(caller)) {
            case null { return #err("Participant not found."); };
            case (?participant) {
                if (participant.signature != null) return #err("Participant already signed.");

                let signatureHash = Crypto.hashBlob(#sha256, signature);

                participants.put(caller, {
                    id = participant.id;
                    internetId = participant.internetId;
                    signature = ?signature;
                    signatureHash = ?Text.fromUtf8(signatureHash);
                    timestamp = ?Time.now();
                });

                if (isContractComplete()) {
                    contractState := #Completed;
                };

                #ok("Signature recorded successfully.");
            }
        }
    };

    // Randomized participant listing
    public query func getRandomizedParticipants(useSimpleShuffle: Bool): [Text] {
        let participantList = Array.fromIter(participants.entries()).map((entry) => entry.1.internetId);
        if (useSimpleShuffle) {
            simpleShuffleArray(participantList)
        } else {
            shuffleArray(participantList)
        }
    };

    // Circular layout for participants
    public query func getCircularParticipants(): [(Principal, Float, Float)] {
        let participantArray = Array.fromIter(participants.entries());
        let count = participantArray.size();
        var circularLayout = Buffer.Buffer<(Principal, Float, Float)>(count);
        
        let pi : Float = 3.14159265359;
        
        var i : Nat = 0;
        while (i < count) {
            let angle : Float = 2.0 * pi * Float.fromInt(i) / Float.fromInt(count);
            let x : Float = Float.cos(angle);
            let y : Float = Float.sin(angle);
            
            switch (participantArray[i].1.id) {
                case id {
                    circularLayout.add((id, x, y));
                };
            };
            i += 1;
        };
        
        Buffer.toArray(circularLayout)
    };

    // Scrambled timestamps
    public query func getScrambledTimestamps(): [(Text, Int)] {
        let participantList = Array.fromIter(participants.entries());
        let scrambledList = shuffleArray(participantList.map((entry) => entry.1));
        scrambledList.map((participant) => (participant.internetId, Option.get(participant.timestamp, 0)))
    };

    // Metadata and status
    public query func getContractMetadata(): ContractMetadata {
        contractMetadata
    };

    public query func getContractStateSimplified(): Text {
        switch (contractState) {
            case (#Draft) "Draft";
            case (#Active) "Active";
            case (#Completed) "Completed";
            case (#Terminated) "Terminated";
        }
    };

    // Helper: Check if contract is complete
    private func isContractComplete(): Bool {
        var signedCount = 0;
        for ((_, participant) in participants.entries()) {
            if (Option.isSome(participant.signature)) signedCount += 1;
        };
        signedCount == requiredParticipants
    };

    // Shuffle helpers
    private func shuffleArray(arr: [Text]): [Text] {
        let result = Array.thaw<Text>(arr);
        for (var i = result.size() - 1; i > 0; i -= 1) {
            let randomIndex = Nat8.toNat(Crypto.hashBlob(#sha256, randomSeed)[0]) % (i + 1);
            let temp = result[i];
            result[i] := result[randomIndex];
            result[randomIndex] := temp;
        };
        Array.freeze(result)
    };

    private func simpleShuffleArray(arr: [Text]): [Text] {
        let result = Array.thaw<Text>(arr);
        for (var i = result.size() - 1; i > 0; i -= 1) {
            let randomIndex = Nat8.toNat(Random.blob()[0]) % (i + 1);
            let temp = result[i];
            result[i] := result[randomIndex];
            result[randomIndex] := temp;
        };
        Array.freeze(result)
    };
}
