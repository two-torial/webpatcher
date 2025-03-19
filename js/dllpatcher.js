/*jshint esversion: 6 */
(function(window, document) {
"use strict";

// form labels often need unique IDs - this can be used to generate some
window.Patcher_uniqueid = 0;
var createID = function() {
    window.Patcher_uniqueid++;
    return "dllpatch_" + window.Patcher_uniqueid;
};

var bytesMatch = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        if(buffer[offset+i] != bytes[i])
            return false;
    }
    return true;
};

var bytesToHex = function(bytes) {
	var s = ''
	for(var i = 0; i < bytes.length; i++) {
        s += bytes[i].toString(16).toUpperCase().padStart(2, '0');
    }
	return s;
}

var hexToBytes = function(hex) {
	var bytes = [];
	for(var i = 0; i < hex.length; i += 2) {
		bytes.push(parseInt(hex.substr(i, 2), 16));
	}
	return bytes;
}

var replace = function(buffer, offset, bytes) {
    for(var i = 0; i < bytes.length; i++) {
        buffer[offset+i] = bytes[i];
    }
};

var whichBytesMatch = function(buffer, offset, bytesArray) {
    for(var i = 0; i < bytesArray.length; i++) {
        if(bytesMatch(buffer, offset, bytesArray[i]))
            return i;
    }
    return -1;
};

// shorthand functions
var createElementClass = function(elName, className, textContent, innerHTML) {
    var el = document.createElement(elName);
    el.className = className || '';
    el.textContent = textContent || ''; // optional
    // overrides textContent with HTML if provided
    if(innerHTML) {
        el.innerHTML = innerHTML;
    }
    return el;
};

var createInput = function(type, id, className) {
    var el = document.createElement('input');
    el.type = type;
    el.id = id;
    el.className = className || '';
    return el;
};

var createLabel = function(labelText, htmlFor, className) {
    var el = document.createElement('label');
    el.textContent = labelText;
    el.htmlFor = htmlFor;
    el.className = className || '';
    return el;
};

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

class StandardPatch {
    constructor(options) {
        this.name = options.name;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        var patch = createElementClass('div', 'patch');
        this.checkbox = createInput('checkbox', id);
        patch.appendChild(this.checkbox);
        patch.appendChild(createLabel(label, id));
        if(this.tooltip) {
            patch.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            patch.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        parent.appendChild(patch);
    }

    updateUI(file) {
        this.checkbox.checked = this.checkPatchBytes(file) === "on";
    }

    validatePatch(file) {
        var status = this.checkPatchBytes(file);
        if(status === "on") {
            console.log('"' + this.name + '"', "is enabled!");
        } else if(status === "off") {
            console.log('"' + this.name + '"', "is disabled!");
        } else {
            return '"' + this.name + '" is neither on nor off! Have you got the right file?';
        }
    }

    applyPatch(file) {
        this.replaceAll(file, this.checkbox.checked);
    }

    replaceAll(file, featureOn) {
        for(var i = 0; i < this.patches.length; i++) {
            replace(file, this.patches[i].offset,
                    featureOn? this.patches[i].on : this.patches[i].off);
        }
    }

    checkPatchBytes(file) {
        var patchStatus = "";
        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            if(bytesMatch(file, patch.offset, patch.off)) {
                if(patchStatus === "") {
                    patchStatus = "off";
                } else if(patchStatus != "off"){
                    return "on/off mismatch within patch";
                }
            } else if(bytesMatch(file, patch.offset, patch.on)) {
                if(patchStatus === "") {
                    patchStatus = "on";
                } else if(patchStatus != "on"){
                    return "on/off mismatch within patch";
                }
            } else {
                return "patch neither on nor off";
            }
        }
        return patchStatus;
    }
}

class DynamicPatch {
    constructor(options) {
        this.name = options.name;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
        this.mode = options.mode;
        this.target = options.target;
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        this.ui = createElementClass('div', 'patch');
        this.checkbox = createInput('checkbox', id);
        this.ui.appendChild(this.checkbox);
        this.ui.appendChild(createLabel(label, id));
        if(this.tooltip) {
            this.ui.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            this.ui.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        parent.appendChild(this.ui);
    }

    updateUI(file) {
        if (this.mode === 'all') {
            this.checkbox.checked = this.checkPatchAll(file, true) === "on";
        } else {
            this.checkbox.checked = this.checkPatch(file, true) === "on";
        }
    }

    validatePatch(file) {
        var status = this.mode === 'all' ? this.checkPatchAll(file) : this.checkPatch(file);

        if(status === "on") {
            console.log('"' + this.name + '"', "is enabled!");
        } else if(status === "off") {
            console.log('"' + this.name + '"', "is disabled!");
        } else {
            return '"' + this.name + '" is neither on nor off! Have you got the right file?';
        }
    }

    applyPatch(file) {
        this.replaceAll(file, this.checkbox.checked);
    }

    replaceAll(file, featureOn) {
        for(let patch of this.patches) {
            if (Array.isArray(patch.offset)) {
                for(const offset of patch.offset) {
                    if (this.target === 'string') {
                        replace(file, offset,
                            new TextEncoder().encode(featureOn? patch.on : patch.off));
                    } else {
                        patch.on = patch.on.map((byte, idx) => byte === 'XX' ? file[offset + idx] : byte);
                        patch.off = patch.off.map((byte, idx) => byte === 'XX' ? file[offset + idx] : byte);
                        replace(file, offset,
                            featureOn? patch.on : patch.off);
                    }
                }
            } else {
                if (this.target === 'string') {
                    replace(file, patch.offset,
                        new TextEncoder().encode(featureOn? patch.on : patch.off));
                } else {
                    patch.on = patch.on.map((byte, idx) => byte === 'XX' ? file[patch.offset + idx] : byte);
                    patch.off = patch.off.map((byte, idx) => byte === 'XX' ? file[patch.offset + idx] : byte);
                    replace(file, patch.offset,
                        featureOn? patch.on : patch.off);
                }
            }
        }
    }

    checkPatch(file, updateUiFlag = false) {
        var patchStatus = "";
        let listUi;
        if (updateUiFlag) {
            listUi = document.createElement('ul');
            this.ui.appendChild(listUi);
        }
        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            var offOffset = this.searchPatchOffset(file, patch.off, i);
            var onOffset = this.searchPatchOffset(file, patch.on, i);
            this.patches[i].offset = offOffset === -1 ? onOffset : offOffset;
            if(offOffset > 0) {
                if (updateUiFlag) {
                    if (this.target === 'string') {
                        listUi.appendChild(createElementClass('li', 'patch-off', null, '0x' + offOffset.toString(16) + ' <b>' + patch.off + '</b> will be replaced with <b>'+ patch.on +'</b>'));
                    } else {
                        listUi.appendChild(createElementClass('li', 'patch-off', '0x' + offOffset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "off";
                }
            } else if(onOffset > 0) {
                if (updateUiFlag) {
                    if (this.target === 'string') {
                        listUi.appendChild(createElementClass('li', 'patch-on', null, '0x' + onOffset.toString(16) + ' <b>' + patch.on + '</b> will be replaced with <b>'+ patch.off +'</b>'));
                    } else {
                        listUi.appendChild(createElementClass('li', 'patch-on', '0x' + onOffset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "on";
                }
            } else if (this.mode === 'all') {
                continue;
            } else {
                return "patch string not found";
            }
        }
        return patchStatus;
    }

    checkPatchAll(file, updateUiFlag = false) {
        var patchStatus = "";
        let listUi;
        if (updateUiFlag) {
            listUi = document.createElement('ul');
            this.ui.appendChild(listUi);
        }
        for(let patch of this.patches) {
            var offOffset = this.searchPatchOffsetAll(file, patch.off);
            var onOffset = this.searchPatchOffsetAll(file, patch.on);
            patch.offset = offOffset.length === 0 ? onOffset : offOffset;

            if(offOffset.length > 0) {
                if (updateUiFlag) {
                    for(const offset of offOffset) {
                        listUi.appendChild(createElementClass('li', 'patch-off', '0x' + offset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "off";
                }
            } else if(onOffset.length > 0) {
                if (updateUiFlag) {
                    for(const offset of onOffset) {
                        listUi.appendChild(createElementClass('li', 'patch-on', '0x' + offset.toString(16) + ' will be replaced'));
                    }
                }
                if(patchStatus === "") {
                    patchStatus = "on";
                }
            } else {
                return "patch string not found";
            }
        }
        return patchStatus;
    }

    searchPatchOffset(file, search, offset) {
        let searchBytes;
        if (this.target === 'string') {
            searchBytes = new TextEncoder().encode(search);
        } else {
            searchBytes = search;
        }

        Uint8Array.prototype.indexOfArr = function(searchElements, fromIndex) {
            fromIndex = fromIndex || 0;

            var index = Array.prototype.indexOf.call(this, searchElements[0], fromIndex);
            if(searchElements.length === 1 || index === -1) {
                return {
                    match: false,
                    index: -1,
                };
            }

            for(var i = index, j = 0; j < searchElements.length && i < this.length; i++, j++) {
                if (this.target !== 'string' && searchElements[j] === 'XX') {
                    continue;
                }
                if(this[i] !== searchElements[j]) {
                    return {
                        match: false,
                        index,
                    };
                }
            }
            return {
                match: true,
                index,
            };
        };

        var idx = 0;
        var foundCount = 0;
        for (var i = 0; i < file.length; i++) {
          var result = file.indexOfArr(searchBytes, idx);
          if (result.match) {
            if (offset === foundCount) {
                return result.index;
            }
              foundCount++;
            } else if (result.index === -1) {
                break;
            }
          idx = result.index + 1;
        }
        return -1;
    }

    searchPatchOffsetAll(file, search) {
        let searchBytes;
        if (this.target === 'string') {
            searchBytes = new TextEncoder().encode(search);
        } else {
            searchBytes = search;
        }

        Uint8Array.prototype.indexOfArr = function(searchElements, fromIndex) {
            fromIndex = fromIndex || 0;

            var index = Array.prototype.indexOf.call(this, searchElements[0], fromIndex);
            if(searchElements.length === 1 || index === -1) {
                return {
                    match: false,
                    index: -1,
                };
            }

            for(var i = index, j = 0; j < searchElements.length && i < this.length; i++, j++) {
                if (this.target !== 'string' && searchElements[j] === 'XX') {
                    continue;
                }
                if(this[i] !== searchElements[j]) {
                    return {
                        match: false,
                        index,
                    };
                }
            }

            return {
                match: true,
                index,
            };
        };

        var idx = 0;
        var foundOffsetArray = [];
        for (var i = 0; i < file.length; i++) {
          var result = file.indexOfArr(searchBytes, idx);
          if (result.match) {
              foundOffsetArray.push(result.index);
          } else if (result.index === -1) {
            break;
          }
          idx = result.index + 1;
        }
        return foundOffsetArray;
    }
}

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI

// The DEFAULT state is always the 1st element in the patches array
class UnionPatch {
    constructor(options) {
        this.name = options.name;
        this.offset = options.offset;
        this.patches = options.patches;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
    }

    createUI(parent) {
        this.radios = [];
        var radio_id = createID();

        var container =  createElementClass('div', 'patch-union');
        container.appendChild(createElementClass('span', 'patch-union-title', this.name + ':'));
        if(this.tooltip) {
            container.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            container.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        container.appendChild(document.createElement('span'));

        for(var i = 0; i < this.patches.length; i++) {
            var patch = this.patches[i];
            var id = createID();
            var label = patch.name;
            var patchDiv = createElementClass('div', 'patch');
            var radio = createInput('radio', id);
            radio.name = radio_id;
            this.radios.push(radio);

            patchDiv.appendChild(radio);
            patchDiv.appendChild(createLabel(label, id));
            if(patch.tooltip) {
                patchDiv.appendChild(createElementClass('div', 'tooltip', patch.tooltip));
            }
            if(patch.danger) {
                patchDiv.appendChild(createElementClass('div', 'danger tooltip', patch.danger));
            }
            container.appendChild(patchDiv);
        }
        parent.appendChild(container);
    }

    updateUI(file) {
        for(var i = 0; i < this.patches.length; i++) {
            if(bytesMatch(file, this.offset, this.patches[i].patch)) {
                this.radios[i].checked = true;
                return;
            }
        }
        // Default fallback
        this.radios[0].checked = true;
    }

    validatePatch(file) {
        for(var i = 0; i < this.patches.length; i++) {
            if(bytesMatch(file, this.offset, this.patches[i].patch)) {
                console.log(this.name, "has", this.patches[i].name, "enabled");
                return;
            }
        }
        return '"' + this.name + '" doesn\'t have a valid patch! Have you got the right file?';
    }

    applyPatch(file) {
        var patch = this.getSelected();
        replace(file, this.offset, patch.patch);
    }

    getSelected() {
        for(var i = 0; i < this.patches.length; i++) {
            if(this.radios[i].checked) {
                return this.patches[i];
            }
        }
        return null;
    }
}

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI
class NumberPatch {
    constructor(options) {
        this.name = options.name;
        this.tooltip = options.tooltip;
        this.danger = options.danger;

        this.offset = options.offset;
        this.size = options.size;
        this.min = options.min;
        this.max = options.max;
        this.littleEndian = options.littleEndian ?? true;

        if (![1, 2, 4].includes(this.size)) {
            throw new Error(`Unsupported number size: ${this.size}.`);
        }
    }

    createUI(parent) {
        var id = createID();
        var label = this.name;
        var patch = createElementClass('div', 'patch');

        patch.appendChild(createLabel(label, id));

        this.number = createInput('number', id);
        this.number.style.width = "3rem";
        if (this.min !== null) {
            this.number.min = this.min;
        }
        if (this.max) {
            this.number.max = this.max;
        }

        patch.appendChild(this.number);


        if (this.tooltip) {
            patch.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if (this.danger) {
            patch.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        parent.appendChild(patch);

    }

    updateUI(file) {
        const arr = new Uint8Array(this.size);
        const view = new DataView(arr.buffer);

        for (var i = 0; i < this.size; i++) {
            arr[i] = file[this.offset + i];
        }

        if (this.size === 1) {
            this.number.value = view.getInt8(0);
        } else if (this.size === 2) {
            this.number.value = view.getInt16(0, this.littleEndian);
        } else if (this.size === 4) {
            this.number.value = view.getInt32(0, this.littleEndian);
        }
    }

    validatePatch(file) {
        return;
    }

    applyPatch(file) {
        // Convert user inputted number to little endian
        const arr = new Uint8Array(this.size);
        const view = new DataView(arr.buffer);

        if (this.size === 1) {
            view.setInt8(0, this.number.value);
        } else if (this.size === 2) {
            view.setInt16(0, this.number.value, this.littleEndian);
        } else if (this.size === 4) {
            view.setInt32(0, this.number.value, this.littleEndian);
        }

        for (var i = 0; i < this.size; i++) {
            file[this.offset + i] = arr[i];
        }
    }
}

// Each unique kind of patch should have createUI, validatePatch, applyPatch,
// updateUI
class HexPatch {
    constructor(options) {
        this.name = options.name;
        this.tooltip = options.tooltip;
        this.danger = options.danger;
		this.offset = options.offset;

		this.off = options.off;
    }

    createUI(parent) {
		this.radios = [];
		var radio_id = createID();

		// Title of the radio option.
        var container = createElementClass('div', 'patch-union');
        container.appendChild(createElementClass('span', 'patch-union-title', this.name + ':'));
        if(this.tooltip) {
            container.appendChild(createElementClass('div', 'tooltip', this.tooltip));
        }
        if(this.danger) {
            container.appendChild(createElementClass('div', 'danger tooltip', this.danger));
        }
        container.appendChild(document.createElement('span'));
		
		// Default option; tooltip shows default hex value.
		var id = createID();
		var patchDiv = createElementClass('div', 'patch');
		var radio = createInput('radio', id);
		radio.name = radio_id;
		this.radios.push(radio);
		
		patchDiv.appendChild(radio);
		patchDiv.appendChild(createLabel('Default', id));
		patchDiv.appendChild(createElementClass('div', 'tooltip', 'Value ' + bytesToHex(this.off)));
		container.appendChild(patchDiv);

		// Custom option.
		id = createID();
		patchDiv = createElementClass('div', 'patch');
		radio = createInput('radio', id);
		radio.name = radio_id;
		this.radios.push(radio);
		
		patchDiv.appendChild(radio);
		patchDiv.appendChild(createLabel('Custom ' + this.off.length + '-byte hex value: ', id));
		this.valueHex = document.createElement('input');
		this.valueHex.type = 'text';
		this.valueHex.id = id;
		patchDiv.appendChild(this.valueHex);
		
		patchDiv.appendChild(createElementClass('div', 'danger tooltip', 'Invalid values will not be applied.'));
		container.appendChild(patchDiv);

        parent.appendChild(container);

    }

    updateUI(file) {
		if(bytesMatch(file, this.offset, this.off)) {
			this.radios[0].checked = true;
			return;
		}
		this.valueHex.value = bytesToHex(file.slice(this.offset, this.offset + this.off.length));
		this.radios[1].checked = true;
    }

    validatePatch(file) {
		if(bytesMatch(file, this.offset, this.off)) {
			console.log(this.name, "has default hex value");
			return;
		}
		console.log(this.name, "has custom hex value");
    }

    applyPatch(file) {
        if(this.radios[0].checked) {
			replace(file, this.offset, this.off);
			return;
		}
		if(this.radios[1].checked) {
			if(!this.valueHex.value.match(/^[0-9a-fA-F]+$/)) {
				alert('Patch "' + this.name + '" not applied - invalid hex!');
				return;
			}
			if(this.valueHex.value.length != this.off.length * 2) {
				alert('Patch "' + this.name + '" not applied - invalid length!!');
				return;
			}
			replace(file, this.offset, hexToBytes(this.valueHex.value));
			return;
		}
    }
}

var loadPatch = function(_this, self, patcher) {
    patcher.loadPatchUI();
    patcher.updatePatchUI();
    patcher.container.style.display = '';
    var successStr = patcher.filename;
    if (typeof _this.description === "string") {
        successStr += "(" + patcher.description + ")";
    }
    self.successDiv.innerHTML = successStr + " loaded successfully!";
};

/**
 * Check if the input is a PE executable, and if it is, parses the PE
 * just enough to see if it's packed with HyperTech CrackProof, by
 * checking if the first DLL import is "KeRnEl32.dLl".
 * 
 * If there was any error parsing the executable or if it was packed,
 * this function returns a string. If there were no errors, this returns
 * undefined.
 * 
 * @param {Uint8Array} dllFile 
 * @returns {string | undefined}
 */
var checkUnpackedExecutable = function(dllFile) {
    // Note to anyone looking: all offsets are absolute file offsets.

    const DOS_EXECUTABLE_MAGIC = [0x4D, 0x5A];
    const PE_EXECUTABLE_MAGIC = [0x50, 0x45, 0x00, 0x00];
    const PE_ROM_MAGIC = 0x107;
    const PE32_MAGIC = 0x10B;
    const PE32_PLUS_MAGIC = 0x20B;
    const OFFSET_IMAGE_OPTIONAL_HEADER32_NUMBER_OF_RVAS = 0x5C;
    const OFFSET_IMAGE_OPTIONAL_HEADER64_NUMBER_OF_RVAS = 0x6C;
    const SIZEOF_IMAGE_IMPORT_DESCRIPTOR = 0x28;
    const CRACKPROOF_KERNEL32_DLL = [
        0x4B, 0x65, 0x52, 0x6E, 0x45, 0x6C, 0x33, 0x32, 0x2E, 0x64, 0x4C, 0x6C, 0x00
    ]; // "KeRnEl32.dLl\0"

    // We do have patchers for other types of files, like chu.acf,
    // so skip the check if we're not looking at a PE executable.
    if (!bytesMatch(dllFile, 0x00, DOS_EXECUTABLE_MAGIC)) {
        return undefined;
    }

    const dllFileView = new DataView(dllFile.buffer);
    const peHeaderOffset = dllFileView.getUint32(0x3C, true);  // e_lfanew
    
    if (!bytesMatch(dllFile, peHeaderOffset, PE_EXECUTABLE_MAGIC)) {
        // Probably a file that accidentally looks like a DOS executable...
        return undefined;
    }

    const numberOfSections = dllFileView.getUint16(peHeaderOffset + 0x06, true);
    const sizeOfOptionalHeader = dllFileView.getUint16(peHeaderOffset + 0x14, true);
    const startOfOptionalHeader = peHeaderOffset + 0x18;
    const startOfSections = startOfOptionalHeader + sizeOfOptionalHeader;

    const rva2offset = (rva) => {
        for (let i = 0; i < numberOfSections; i++) {
            const sectionHeaderOffset = startOfSections + 0x28 * i;
            const virtualSize = dllFileView.getUint32(sectionHeaderOffset + 0x08, true);
            const virtualAddress = dllFileView.getUint32(sectionHeaderOffset + 0x0C, true);
            const pointerToRawData = dllFileView.getUint32(sectionHeaderOffset + 0x14, true);
    
            if (virtualAddress <= rva && (virtualAddress + virtualSize) > rva) {
                return rva - virtualAddress + pointerToRawData;
            }
        }
        
        return -1;
    };

    const magic = dllFileView.getUint16(startOfOptionalHeader, true);

    if (![PE_ROM_MAGIC, PE32_MAGIC, PE32_PLUS_MAGIC].includes(magic)) {
        return `Unknown PE format ${magic}.`;
    }

    const numberOfRvaAndSizesOffset = startOfOptionalHeader + (
        magic === PE32_PLUS_MAGIC
            ? OFFSET_IMAGE_OPTIONAL_HEADER64_NUMBER_OF_RVAS
            : OFFSET_IMAGE_OPTIONAL_HEADER32_NUMBER_OF_RVAS
        );
    const numberOfRvaAndSizes = dllFileView.getUint32(numberOfRvaAndSizesOffset, true);

    // No import directory, apparently. Not our problem then.
    if (numberOfRvaAndSizes < 2) {
        return undefined;
    }

    const startOfDataDirectories = numberOfRvaAndSizesOffset + 0x04;

    // The import directory is the second directory (index 1), as can be seen in winnt.h:
    //     #define IMAGE_DIRECTORY_ENTRY_IMPORT          1
    const importDirectoryRva = dllFileView.getUint32(startOfDataDirectories + 0x08, true);
    const importDirectorySize = dllFileView.getUint32(startOfDataDirectories + 0x0C, true);

    // No imports, also not our problem.
    if (importDirectorySize < SIZEOF_IMAGE_IMPORT_DESCRIPTOR) {
        return undefined;
    }

    const importDirectoryOffset = rva2offset(importDirectoryRva);

    if (importDirectoryOffset === -1) {
        return "Could not convert import directory RVA to offset.";
    }

    const importDllNameRva = dllFileView.getUint32(importDirectoryOffset + 12, true);
    const importDllNameOffset = rva2offset(importDllNameRva);

    if (importDllNameOffset === -1) {
        return "Could not convert import DLL name RVA to offset.";
    }

    if (bytesMatch(dllFile, importDllNameOffset, CRACKPROOF_KERNEL32_DLL)) {
        return "This executable is packed with CrackProof. Please obtain an unpacked executable.";
    }

    return undefined;
}

class PatchContainer {
    constructor(patchers) {
        this.patchers = patchers;
        this.createUI();
    }

    getSupportedDLLs() {
        var dlls = [];
        for (var i = 0; i < this.patchers.length; i++) {
            var name = this.patchers[i].filename;
            if (dlls.indexOf(name) === -1) {
                dlls.push(name);
            }
        }
        return dlls;
    }

    createUI() {
        var self = this;
        var container = createElementClass('div', 'patchContainer');
        var header = this.getSupportedDLLs().join(", ");
        container.innerHTML = "<h3>" + header + "</h3>";

        var supportedDlls = document.createElement('ul');
        this.forceLoadTexts = [];
        this.forceLoadButtons = [];
        this.matchSuccessText = [];
        for (var i = 0; i < this.patchers.length; i++) {
            var checkboxId = createID();

            var listItem = document.createElement('li');
            listItem.appendChild(createLabel(this.patchers[i].description, checkboxId, 'patchPreviewLabel'));
            var matchPercent = createElementClass('span', 'matchPercent');
            this.forceLoadTexts.push(matchPercent);
            listItem.appendChild(matchPercent);
            var matchSuccess = createElementClass('span', 'matchSuccess');
            this.matchSuccessText.push(matchSuccess);
            listItem.appendChild(matchSuccess);
            var forceButton = createElementClass('button', '', 'Force load?');
            forceButton.style.display = 'none';
            this.forceLoadButtons.push(forceButton);
            listItem.appendChild(forceButton);

            var input = createInput('checkbox', checkboxId, 'patchPreviewToggle');
            listItem.appendChild(input);
            var patchPreviews = createElementClass('ul', 'patchPreview');
            for (var j = 0; j < this.patchers[i].mods.length; j++) {
                var patchName = this.patchers[i].mods[j].name;
                patchPreviews.appendChild(createElementClass('li', null, patchName));
            }
            listItem.appendChild(patchPreviews);

            supportedDlls.appendChild(listItem);
        }

        ["dragover", "dragenter"].forEach(function(n){
            document.documentElement.addEventListener(n,function (e) {
                container.classList.add("dragover");
                e.preventDefault();
                e.stopPropagation();
            });
        });
        ["dragleave", "dragend", "drop"].forEach(function(n){
            document.documentElement.addEventListener(n,function (e) {
                container.classList.remove("dragover");
                e.preventDefault();
                e.stopPropagation();
            });
        });

        container.addEventListener("drop", function (e) {
            var files = e.dataTransfer.files;
            if (files && files.length > 0)
                self.loadFile(files[0]);
        });

        var filepickerId = createID();
        this.fileInput = createInput('file', filepickerId, 'fileInput');
        var label = createLabel('', filepickerId, 'fileLabel');
        label.innerHTML = "<strong>Choose a file</strong> or drag and drop.";

        this.fileInput.addEventListener("change", function (e) {
            if (this.files && this.files.length > 0)
                self.loadFile(this.files[0]);
        });

        this.successDiv = createElementClass('div', 'success');
        this.errorDiv = createElementClass('div', 'error');

        container.appendChild(this.fileInput);
        container.appendChild(label);

        container.appendChild(createElementClass('h4', null, 'Supported Versions:'));
        container.appendChild(createElementClass('h5', null, 'Click name to preview patches'));
        container.appendChild(supportedDlls);
        container.appendChild(this.successDiv);
        container.appendChild(this.errorDiv);
        document.body.appendChild(container);
    }

    loadFile(file) {
        var reader = new FileReader();
        var self = this;

        reader.onload = function (e) {
            var found = false;
            // clear logs
            self.errorDiv.textContent = '';
            self.successDiv.textContent = '';

            const error = checkUnpackedExecutable(new Uint8Array(e.target.result));

            if (error) {
                self.errorDiv.innerHTML = error;
                return;
            }

            for (var i = 0; i < self.patchers.length; i++) {
                // reset text and buttons
                self.forceLoadButtons[i].style.display = 'none';
                self.forceLoadTexts[i].textContent = '';
                self.matchSuccessText[i].textContent = '';
                var patcher = self.patchers[i];
                // remove the previous UI to clear the page
                patcher.destroyUI();
                // patcher UI elements have to exist to load the file
                patcher.createUI();
                patcher.container.style.display = 'none';
                patcher.loadBuffer(e.target.result);
                if (patcher.validatePatches()) {
                    found = true;
                    loadPatch(this, self, patcher);
                    // show patches matched for 100% - helps identify which version is loaded
                    var valid = patcher.validPatches;
                    self.matchSuccessText[i].textContent = ' ' + valid + ' of ' + valid + ' patches matched (100%) ';
                }
            }

            if (!found) {
                // let the user force a match
                for (let i = 0; i < self.patchers.length; i++) {
                    const patcher = self.patchers[i];

                    const valid = patcher.validPatches;
                    const percent = (valid / patcher.totalPatches * 100).toFixed(1);

                    self.forceLoadTexts[i].textContent = ' ' + valid + ' of ' + patcher.totalPatches + ' patches matched (' + percent + '%) ';
                    self.forceLoadButtons[i].style.display = '';
                    self.forceLoadButtons[i].onclick = function(i) {
                        // reset old text
                        for(var j = 0; j < self.patchers.length; j++) {
                            self.forceLoadButtons[j].style.display = 'none';
                            self.forceLoadTexts[j].textContent = '';
                        }


                        loadPatch(this, self, self.patchers[i]);
                    }.bind(this, i);
                }
                self.errorDiv.innerHTML = "No patch set was a 100% match.";
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

class Patcher {
    constructor(fname, description, args) {
        this.mods = [];
        for(var i = 0; i < args.length; i++) {
            var mod = args[i];
            if(mod.type) {
                if(mod.type === "union") {
                    this.mods.push(new UnionPatch(mod));
                }
                if(mod.type === "number") {
                    this.mods.push(new NumberPatch(mod));
                }
                if(mod.type === "dynamic") {
                    this.mods.push(new DynamicPatch(mod));
                }
                if(mod.type === "hex") {
                    this.mods.push(new HexPatch(mod));
                }
            } else { // standard patch
                this.mods.push(new StandardPatch(mod));
            }
        }

        this.filename = fname;
        this.description = description;
        this.multiPatcher = true;

        if (!this.description) {
            // old style patcher, use the old method to generate the UI
            this.multiPatcher = false;
            this.createUI();
            this.loadPatchUI();
        }
    }

    createUI() {
        var self = this;
        this.container = createElementClass('div', 'patchContainer');
        var header = this.filename;
        if(this.description === "string") {
            header += ' (' + this.description + ')';
        }
        this.container.innerHTML = '<h3>' + header + '</h3>';

        this.successDiv = createElementClass('div', 'success');
        this.errorDiv = createElementClass('div', 'error');
        this.patchDiv = createElementClass('div', 'patches');

        var saveButton = document.createElement('button');
        saveButton.disabled = true;
        saveButton.textContent = 'Load file First';
        saveButton.addEventListener('click', this.saveDll.bind(this));
        this.saveButton = saveButton;

        if (!this.multiPatcher) {
            ["dragover", "dragenter"].forEach(function(n){
                document.documentElement.addEventListener(n,function(e) {
                    self.container.classList.add('dragover');
                    e.preventDefault();
                    return true;
                });
            });
            ["dragleave", "dragend", "drop"].forEach(function(n){
                document.documentElement.addEventListener(n,function(e) {
                    self.container.classList.remove('dragover');
                    e.preventDefault();
                    return true;
                });
            });

            this.container.addEventListener('drop', function(e) {
                var files = e.dataTransfer.files;
                if(files && files.length > 0)
                    self.loadFile(files[0]);
            });

            var filepickerId = createID();
            this.fileInput = createInput('file', filepickerId, 'fileInput');
            var label = createLabel('', filepickerId, 'fileLabel');
            label.innerHTML = '<strong>Choose a file</strong> or drag and drop.';

            this.fileInput.addEventListener('change', function(e) {
                if(this.files && this.files.length > 0)
                    self.loadFile(this.files[0]);
            });

            this.container.appendChild(this.fileInput);
            this.container.appendChild(label);
        }

        this.container.appendChild(this.successDiv);
        this.container.appendChild(this.errorDiv);
        this.container.appendChild(this.patchDiv);
        this.container.appendChild(saveButton);
        document.body.appendChild(this.container);
    }

    destroyUI() {
        if (this.hasOwnProperty("container"))
            this.container.remove();
    }

    loadBuffer(buffer) {
        this.dllFile = new Uint8Array(buffer);
        if(this.validatePatches()) {
            this.successDiv.classList.remove("hidden");
            this.successDiv.innerHTML = "File loaded successfully!";
        } else {
            this.successDiv.classList.add("hidden");
        }
        // Update save button regardless
        this.saveButton.disabled = false;
        this.saveButton.textContent = 'Save Patched File';
        this.errorDiv.innerHTML = this.errorLog;
    }

    loadFile(file) {
        var reader = new FileReader();
        var self = this;

        reader.onload = function(e) {
            self.loadBuffer(e.target.result);
            self.updatePatchUI();
        };

        reader.readAsArrayBuffer(file);
    }

    downloadURI(uri, filename) {
        // http://stackoverflow.com/a/18197341
        var element = document.createElement('a');
        element.setAttribute('href', uri);
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    saveDll() {
        if(!this.dllFile || !this.mods || !this.filename)
            return;

        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].applyPatch(this.dllFile);
        }

        var blob = new Blob([this.dllFile], {type: "application/octet-stream"});
        var uri = URL.createObjectURL(blob);
        this.downloadURI(uri, this.filename);
        URL.revokeObjectURL(uri);
    }

    loadPatchUI() {
        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].createUI(this.patchDiv);
        }
    }

    updatePatchUI() {
        for(var i = 0; i < this.mods.length; i++) {
            this.mods[i].updateUI(this.dllFile);
        }
    }

    validatePatches() {
        this.errorLog = "";
        var success = true;
        this.validPatches = 0;
        this.totalPatches = this.mods.length;
        for(var i = 0; i < this.mods.length; i++) {
            var error = this.mods[i].validatePatch(this.dllFile);
            if(error) {
                this.errorLog += error + "<br/>";
                success = false;
            } else {
                this.validPatches++;
            }
        }
        return success;
    }
}

window.Patcher = Patcher;
window.PatchContainer = PatchContainer;

})(window, document);
