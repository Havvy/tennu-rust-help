// crate (Version) - Desc -> URL
const fetch = require("node-fetch");
fetch.Promise = require("bluebird");
const format = require("util").format;
const inspect = require("util").inspect;

// https://stackoverflow.com/questions/1267283/how-can-i-create-a-zerofilled-value-using-javascript
// Note(Havvy): Does *not* work if num === 0.
function zeroPad (num, numZeros) {
    var an = Math.abs (num);
    var digitCount = 1 + Math.floor (Math.log (an) / Math.LN10);
    if (digitCount >= numZeros) {
        return num;
    }
    var zeroString = Math.pow (10, numZeros - digitCount).toString ().substr (1);
    return num < 0 ? '-' + zeroString + an : zeroString + an;
}

module.exports = {
    init: function (client, deps) {
        return {
            handlers: {
                "!crate": function (command) {
                    if (command.args.length === 0) {
                        return "Usage: !crate <crate-name>";
                    }

                    const crate = command.args[0];

                    if (/[^a-z0-9_-]/i.test(crate)) {
                        return format("Unsupported characters in '%s' detected.", crate);
                    }

                    return fetch(format("https://crates.io/api/v1/crates/%s", crate))
                    .then(function (res) {
                        console.log("Got response.");
                        return res.json();
                    })
                    .then(function (crateInfo) {
                        // When the crate does not exist, the following is returned:
                        // {"errors":[{"detail":"Not Found"}]}
                        if (crateInfo.errors) {
                            if (crateInfo.errors.some(function (error) { return error.detail === "Not Found"; })) {
                                return format("Crate '%s' does not exist.", crate);
                            } else {
                                client.warn("PluginRustHelp", "Unknown error reached looking up crate '%s'.", crate);
                                client.warn("PluginRustHelp", inspect(crateInfo.errors));
                                return format("Unknown error reached when looking up crate '%s'.", crate);
                            }
                        }

                        // When the create exists, but all versions are yanked, the description becomes null?
                        // Note(Havvy): This is probably wrong. Just basing off of rust-bindgen package.
                        if (crateInfo.crate.description === null) {
                            return format("Crate '%s' was yanked.", crateInfo.crate.id);
                        }

                        // When the crate does exist, we'll get the following document:
                        // { crate: { id: "", max_version: "", description: "Description\n", ... }, ... }
                        const id = crateInfo.crate.id;
                        const version = crateInfo.crate.max_version;
                        const description = crateInfo.crate.description.replace(/\n/g, " ");
                        const url = format("https://crates.io/crates/%s", id);
                        const docurl = format("https://docs.rs/crate/%s", id);

                        return format("%s (%s) - %s -> %s <%s>", id, version, description, url, docurl);
                    })
                    .catch(function (err) {
                        client.error("PluginRustHelp", err.name);
                        client.error("PluginRustHelp", err.stack);
                        return format("Unknown error reached when looking up crate '%s'.", crate);
                    });
                },

                "!error": function (command) {
                    if (command.args.length === 0) {
                        return "Usage: !error <int>";
                    }

                    const error = Number(command.args[0]);

                    if (isNaN(error) || Math.floor(error) !== error || error < 1 || error > 9999) {
                        return "Error code must be between 0000 and 9999.";
                    }

                    return format("https://doc.rust-lang.org/error-index.html#E%s", zeroPad(error, 4));
                }
            },

            commands: ["crate", "error"],

            help: {
                "crate": [
                    "{{!}}crate <crate-name>",
                    "",
                    "Return basic metadata about the crate."
                ],

                "error": [
                    "{{!}}error <error-code>",
                    "",
                    "Return link to the specified error.",
                    "Ex: {{!}}error 303"
                ]
            }
        };
    }
};
