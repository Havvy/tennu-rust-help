// crate (Version) - Desc -> URL
const fetch = require("node-fetch");
fetch.Promise = require("bluebird");
const format = require("util").format;
const inspect = require("util").inspect;

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

                        // When the crate does exist, we'll get the following document:
                        // { crate: { id: "", max_version: "", description: "Description\n", ... }, ... }
                        const id = crateInfo.crate.id;
                        const version = crateInfo.crate.max_version;
                        const description = crateInfo.crate.description.replace(/\n/g, "");
                        const url = format("https://crates.io/crates/%s", id);

                        return format("%s (%s) - %s -> %s", id, version, description, url);
                    })
                    .catch(function (err) {
                        client.error("PluginRustHelp", err.name);
                        client.error("PluginRustHelp", err.stack);
                        return format("Unknown error reached when looking up crate '%s'.", crate);
                    });
                }
            },

            commands: ["crate"],

            help: {
                "crate": [
                    "{{!}}crate <crate-name>",
                    "",
                    "Return basic metadata about the crate."
                ]
            }
        };
    }
};