# Doodle Competition Server

1. Create a keypair for the server

    ```sh
    npx ucan-key ed --json
    ```

    Note down `did` and `key` values!

1. Install the w3cli:

    ```sh
    npm i -g @web3-storage/w3cli
    ```

1. Create a space for where the uploads will be registered:

    ```sh
    w3 authorize you@email.com
    w3 space create doodle-comp
    w3 space register
    ```

1. Delegate from your local machine to the server:

    ```sh
    w3 delegation create <did_from_ucan-key_command_above> -c 'upload/*' | base64
    ```


