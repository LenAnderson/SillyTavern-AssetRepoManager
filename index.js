import { eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';
import { POPUP_RESULT, POPUP_TYPE, Popup } from '../../../popup.js';

class Repository {
    /**@type {string}*/ title;
    /**@type {string}*/ url;
    /**@type {HTMLElement}*/ option;

    constructor(title, url) {
        this.title = title;
        this.url = url;
    }

    toJSON() {
        return {
            title: this.title,
            url: this.url,
        };
    }
}


class Settings {
    static from(props) {
        props.repositoryList = (props.repositoryList ?? []).map(it=>new Repository(it.title, it.url));
        return Object.assign(new Settings(), props);
    }

    /**@type {Repository[]}*/ repositoryList = [];
    /**@type {string}*/ url;
    get repository() { return this.repositoryList.find(it=>it.url == this.url) ?? originalRepo; }
}


/**@type {Repository}*/
let originalRepo;
/**@type {Settings}*/
let settings;


const initSettings = ()=>{
    settings = Settings.from(extension_settings.assetRepoManager ?? {});
    extension_settings.assetRepoManager = settings;
};
const init = ()=>{
    initSettings();
    const connect = /**@type {HTMLElement}*/(document.querySelector('#assets-connect-button'));
    const lbl = /**@type {HTMLLabelElement}*/(document.querySelector('label[for="assets-json-url-field"]'));
    lbl.textContent = 'Assets Repository';
    lbl.htmlFor = 'assets-json-url-select';
    const originalInput = /**@type {HTMLInputElement}*/(document.querySelector('#assets-json-url-field'));
    originalRepo = new Repository(
        'SillyTavern - Content (official assets)',
        originalInput.value,
    );
    const sel = document.createElement('select'); {
        sel.id = 'assets-json-url-select';
        sel.classList.add('text_pole');
        sel.addEventListener('change', ()=>{
            settings.url = sel.value;
            originalInput.value = sel.value;
            originalInput.dispatchEvent(new Event('change', { bubbles:true }));
            originalInput.dispatchEvent(new Event('input', { bubbles:true }));
            connect.click();
            saveSettingsDebounced();
        });
        for (const repo of [originalRepo, ...settings.repositoryList.toSorted((a,b)=>a.title.toLowerCase().localeCompare(b.title.toLowerCase()))]) {
            const opt = document.createElement('option'); {
                opt.value = repo.url;
                opt.textContent = repo.title;
                repo.option = opt;
                sel.append(opt);
            }
        }
        originalInput.insertAdjacentElement('beforebegin', sel);
    }
    sel.value = settings.repository.url ?? originalRepo.url;
    sel.dispatchEvent(new Event('change'));

    const addBtn = document.createElement('div'); {
        addBtn.classList.add('menu_button');
        addBtn.classList.add('fa-solid');
        addBtn.classList.add('fa-xl');
        addBtn.classList.add('fa-plus');
        addBtn.title = 'Add asset repository';
        addBtn.addEventListener('click', async()=>{
            const dom = document.createElement('div');
            const h3 = document.createElement('h3'); {
                h3.textContent = 'Add Asset Repository';
                dom.append(h3);
            }
            const title = document.createElement('input'); {
                title.classList.add('text_pole');
                title.placeholder = 'Title';
                dom.append(title);
            }
            const url = document.createElement('input'); {
                url.classList.add('text_pole');
                url.placeholder = 'Repository URL';
                dom.append(url);
            }
            const dlg = new Popup(dom, POPUP_TYPE.CONFIRM, null, { okButton: 'Add', cancelButton: 'Cancel' });
            await dlg.show();
            if (dlg.result == POPUP_RESULT.AFFIRMATIVE) {
                const repo = new Repository(title.value, url.value);
                settings.repositoryList.push(repo);
                const opt = document.createElement('option'); {
                    opt.value = repo.url;
                    opt.textContent = repo.title;
                    repo.option = opt;
                    const before = settings.repositoryList.find(it=>it.title.toLowerCase().localeCompare(repo.title.toLowerCase()) == 1);
                    if (before) {
                        before.option.insertAdjacentElement('beforebegin', opt);
                    } else {
                        sel.append(opt);
                    }
                }
                sel.value = repo.url;
                originalInput.value = repo.url;
                settings.url = repo.url;
                saveSettingsDebounced();
                sel.dispatchEvent(new Event('change'));
            }
        });
        sel.parentElement.append(addBtn);
    }

    const editBtn = document.createElement('div'); {
        editBtn.classList.add('menu_button');
        editBtn.classList.add('fa-solid');
        editBtn.classList.add('fa-xl');
        editBtn.classList.add('fa-pencil');
        editBtn.title = 'Edit asset repository';
        editBtn.addEventListener('click', async()=>{
            if (settings.repository == originalRepo) {
                toastr.warning('Cannot edit default repository');
                return;
            }
            const dom = document.createElement('div');
            const h3 = document.createElement('h3'); {
                h3.textContent = 'Edit Asset Repository';
                dom.append(h3);
            }
            const title = document.createElement('input'); {
                title.classList.add('text_pole');
                title.placeholder = 'Title';
                title.value = settings.repository.title;
                dom.append(title);
            }
            const url = document.createElement('input'); {
                url.classList.add('text_pole');
                url.placeholder = 'Repository URL';
                url.value = settings.repository.url;
                dom.append(url);
            }
            const dlg = new Popup(dom, POPUP_TYPE.CONFIRM, null, { okButton: 'Save', cancelButton: 'Cancel' });
            await dlg.show();
            if (dlg.result == POPUP_RESULT.AFFIRMATIVE) {
                const repo = settings.repository;
                repo.title = title.value;
                repo.url = url.value;
                repo.option.value = repo.url;
                repo.option.textContent = repo.title;
                originalInput.value = repo.url;
                settings.url = repo.url;
                saveSettingsDebounced();
                sel.dispatchEvent(new Event('change'));
            }
        });
        sel.parentElement.append(editBtn);
    }

    const delBtn = document.createElement('div'); {
        delBtn.classList.add('menu_button');
        delBtn.classList.add('fa-solid');
        delBtn.classList.add('fa-xl');
        delBtn.classList.add('fa-trash-can');
        delBtn.classList.add('redWarningBG');
        delBtn.title = 'Remove asset repository\n(just the repository, not the installed extensions)';
        delBtn.addEventListener('click', async()=>{
            if (settings.repository == originalRepo) return;
            settings.repository.option.remove();
            settings.repositoryList.splice(settings.repositoryList.indexOf(settings.repository), 1);
            settings.url = originalRepo.url;
            sel.value = originalRepo.url;
            originalInput.value = originalRepo.url;
            saveSettingsDebounced();
        });
        sel.parentElement.append(delBtn);
    }
};
eventSource.once(event_types.APP_READY, ()=>init());
