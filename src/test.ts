import { initClient } from "./init";
const client = initClient();

async function main() {
    const user_auth_test = await client.rest.user.verifyAuthentication();

    if (!user_auth_test) {
        console.log("user not authorized")
    }
    const profiles = await client.rest.profile.listProfiles(true);
    console.log(profiles)
}

main()