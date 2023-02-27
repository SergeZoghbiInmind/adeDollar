/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

'use strict';

const {St, Gio, Clutter, Soup, GLib} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let panelButton;
let panelButtonText;
let session;
let sourceId = null;
let oldValue = 0;

// Start application
function init() {
    log(`initializing ${Me.metadata.name}`);
}

// Add the button to the panel
function enable() {
    panelButton = new St.Bin({
        style_class: "panel-button",
    });

    handle_request_api();
    Main.panel._centerBox.insert_child_at_index(panelButton, 0);
    sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 150, () => {
        handle_request_api();
        return GLib.SOURCE_CONTINUE;
    });
}

// Remove the added button from panel
function disable() {
    panelButtonText = null;
    session = null;
    Main.panel._centerBox.remove_child(panelButton);

    if (panelButton) {
        panelButton.destroy();
        panelButton = null;
    }

    if (sourceId) {
        GLib.Source.remove(sourceId);
        sourceId = null;
    }
}

Date.prototype.yyyymmdd = function () {
    var mm = this.getMonth() + 1;
    var dd = this.getDate();
    var hh = this.getHours();

    return [this.getFullYear(),
        mm,
        dd,
        hh
    ].join('');
};


// Handle Requests API
function handle_request_api() {
    let dollarQuotation = null;

    // Create a new Soup Session
    if (!session) {
        session = new Soup.Session();
    }
    let time = new Date();
    const uri = Soup.URI.new('https://lirarate.org/wp-json/lirarate/v2/rates?currency=LBP&_ver=' + "t" + time.yyyymmdd())
    // Create body of Soup request
    let message = Soup.Message.new_from_uri(
        'GET',
        uri
    );
    session.queue_message(message, () => {

        if (!message.response_body.data) {
            panelButtonText = new St.Label({
                text: "Not Working",
                y_align: Clutter.ActorAlign.CENTER,
            });
            panelButton.set_child(panelButtonText);
            session.abort();
            return;
        }
        let body_response = JSON.parse(message.response_body.data);

        dollarQuotation = body_response["sell"][body_response["sell"].length - 1][1];

        let arrow = "";

        if (oldValue !== dollarQuotation) {
            if (oldValue < dollarQuotation) {
                arrow = "⬆";
            } else {
                arrow = "⬇";
            }
        }


        panelButtonText = new St.Label({
            text: " USD: LBP " + dollarQuotation + " " + arrow,
            y_align: Clutter.ActorAlign.CENTER,
        });

        panelButton.set_child(panelButtonText);
        session.abort();
        return;
    });
    return;
}
