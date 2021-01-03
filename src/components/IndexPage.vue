<template>
    <div class="m-2">
        <b-row class="m-0 mb-2">
            <b-col class="p-0">
                <b-input-group>
                    <template #prepend>
                        <b-input-group-text><strong>Путь к файлу</strong></b-input-group-text>
                    </template>
                    <b-input contenteditable="false" v-model="openedFile"></b-input>
                    <template #append>
                        <b-btn variant="info" @click="onOpenFile">...</b-btn>
                        <b-btn variant="success" @click="onFileSave" :disabled="!isSaveActive">Сохранить</b-btn>
                    </template>
                </b-input-group>
            </b-col>
        </b-row>
        <b-row class="m-0 mb-2">
            <b-col class="p-0">
                <b-input-group>
                    <template #prepend>
                        <b-input-group-text><strong>Путь к корню jenkins относительно файла</strong>
                        </b-input-group-text>
                    </template>
                    <b-input v-model="rootDir"></b-input>
                </b-input-group>
            </b-col>
        </b-row>
        <MarkdownEditor
            max-height="800px"
            min-height="800px"
            v-model="text"
            :upload-func="onUpload"
            :preview-render-func="previewRenderFunc"
        />
    </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'
import MarkdownEditor from "./MarkdownEditor.vue";
import fs from 'fs';
import path from 'path';
import {Watch} from "vue-property-decorator";
import marked from "marked";
import * as Buffer from "buffer";

const {dialog} = require('electron').remote
const Store = require('electron-store');
const store = new Store();


@Component({
    components: {MarkdownEditor}
})
export default class IndexPage extends Vue {
    text: string = "";
    initText: string = "";
    openedFile: string = "";
    rootDir: string = ""
    assetsPath: string = ""
    options: any = {};

    OPTIONS_REGEXP = /---(.*?)---/ms;

    @Watch("rootDir")
    onRootDirChanged() {

    }

    @Watch("openedFile")
    onOpenedFileChanged() {
        if (!this.openedFile) {
            return
        }

        fs.readFile(this.openedFile, 'utf8', (err, data) => {
            this.text = data;

            this.updateOptions()

            this.initText = this.text;

            store.set("openedFile", this.openedFile)
            // data is the contents of the text file we just read
        });
    }

    get isSaveActive() {
        return this.initText != this.text;
    }

    updateOptions() {
        let options = this.extractOptions(this.text);

        if (!options['rootDir']) {
            options['rootDir'] = this.findRootDir()
        }

        this.options = options;

        this.rootDir = options['rootDir']
        this.text = this.replaceOptions(this.text, options);
    }

    async onUpload(file: File) {


        let ext = path.extname(this.openedFile)
        let name = path.basename(this.openedFile, ext)
        let assets_folder = path.join('assets', name);
        let folder = path.join(this.openedFile, this.rootDir, assets_folder)
        let length = fs.readdirSync(folder).length
        let filename = `${String(length).padStart(3, '0')}_${file.name}`

        let buffer: Buffer = new (Buffer as any).from(await file.arrayBuffer());
        fs.writeFile(path.join(folder, filename), buffer, err => {
            if (err) return console.log(err);
        })

        return {
            link: path.join("/", assets_folder, filename).replace(/\\/g, "/"),
        }
    }

    previewRenderFunc(text: string) {
        let dir = "file://" + path.join(this.openedFile, this.rootDir).replace(/\\/g, "/");
        text = text.replace(/(!\[.*?\]\()(\/assets.*?)(\))/g, `$1${dir}$2$3`)
        text = marked(text)
        return text;
    }

    extractOptions(text: string) {
        let options = text.match(this.OPTIONS_REGEXP)
        let dict: any = {}
        if (options) {
            let match = options[1]
            let match_splited = match.trim().split(/\r?\n/)
            match_splited?.forEach(item => {
                let m = item.match(/(\w+):\s?(.*)/m)
                if (m) {
                    dict[m[1]] = m[2];
                }
            })
        }
        return dict
    }

    replaceOptions(text: string, options: any) {
        let optionsJoined = "";
        Object.keys(options).forEach(x => {
            optionsJoined += `${x}: ${options[x]}\n`
        })
        text = text.replace(this.OPTIONS_REGEXP, `---\n${optionsJoined.trim()}\n---`)
        return text
    }

    findRootDir() {
        let currentDir = path.dirname(this.openedFile)
        let rootDir = "";
        for (let i = 0; i < 5; ++i) {
            let files = fs.readdirSync(currentDir)
            if (files.indexOf("Gemfile") >= 0) {
                rootDir += "../";
                break
            }
            rootDir += "../";
            currentDir = path.dirname(currentDir);
        }
        return rootDir;
    }

    created() {
        this.openedFile = store.get("openedFile");
    }

    mounted() {
        document.addEventListener("keydown", this.onKey);
    }

    beforeDestroy() {
        document.removeEventListener("keydown", this.onKey);
    }

    onKey (e: any) {
        if (e.ctrlKey && (e.which == 83)) {
            e.preventDefault();
            this.onFileSave()
        }
    }

    onOpenFile() {
        let files = dialog.showOpenDialogSync({
            filters: [
                {name: 'Markdown', extensions: ['md']},
            ]
        })
        if (files) {
            this.openedFile = files[0]
            this.initText = this.text;
        }
    }

    onFileSave() {
        fs.writeFile(this.openedFile, this.text, err => {
            if (err) return console.log(err);
            this.initText = this.text;
        });
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

</style>
