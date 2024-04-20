'use strict';

import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const { Uri } = require('vscode');

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('extension.generateMap', (el) => {

		let tree = '<bold><span class="t-icon" name="icons">📦</span>' + path.basename(el.fsPath) + '</bold> <br>' + entryTrees(el.fsPath, 0);
        // 生成流程图
        let graph = entryGraph(el.fsPath, 0);

		let tree_col = vscode.window.createWebviewPanel('text', 'Generate Tree and Graph Views',
		{ viewColumn: vscode.ViewColumn.Active }, { enableScripts: true });
	
		// 替换模板中的占位符
		let htmlContent = OutputElements.Template.replace('--TREE--', tree).replace('--GRAPH--', graph);
		tree_col.webview.html = htmlContent;
		tree_col.webview.onDidReceiveMessage(
			message => {
				// vscode.window.showErrorMessage('Failed to save MindMap.md: ' + message);
				if (message.command === 'saveMindMap') {
					const fsPath = vscode.Uri.joinPath(context.extensionUri, 'MindMap.md');
					vscode.workspace.fs.writeFile(fsPath, Buffer.from(message.text, 'utf8')).then(() => {
						vscode.window.showInformationMessage('MindMap.md has been saved successfully!');
					}, err => {
						vscode.window.showErrorMessage('Failed to save MindMap.md: ' + err.message);
					});
				}
			},
			undefined,
			context.subscriptions
		);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}

// directory and file ditective function
export function entryTrees (trgPath: string, deps: number) {
    let treeText = '';
    if (!fs.existsSync(trgPath)) { return ''; }

    // string format for tree text
    let format = function (deps: number, pipe: string, name: string) {
        return ' ' + Array(deps + 1).join('┃ ') + pipe + name + '<br>';
    };

    // order by directory > file
    let beforSortFiles: Array<object> = fs.readdirSync(trgPath);
    let paths: Array<object> = [];

    let tmpFiles: Array<object> = [];
    beforSortFiles.forEach(target => {
        let fullPath = path.join(trgPath, target.toString());
        if (fs.statSync(fullPath).isDirectory()) {
            paths.push(target);
        } else {
            tmpFiles.push(target);
        }
    });
    paths = paths.concat(tmpFiles);

    paths.forEach(item => {
        let fullPath = path.join(trgPath, item.toString());
        let pipe = paths.indexOf(item) === paths.length - 1 ? '┗ ' : '┣ ';
        
        if (fs.statSync(fullPath).isDirectory()) {
            treeText += format(deps, pipe, '<span class="t-icon" name="icons">📂</span>' + item.toString());
            treeText += entryTrees(fullPath, deps + 1);
        } else {
            treeText += format(deps, pipe, '<span class="t-icon" name="icons">📜</span>' + item.toString());
        }
    });
    return treeText;
}



export function entryGraph(trgPath: string, deps: number, parent: string = '') {
    let graphText = '';
    if (!fs.existsSync(trgPath)) { return ''; }

    // 获取目录和文件列表
    let beforSortFiles: Array<object> = fs.readdirSync(trgPath);
    let paths: Array<object> = [];
    let tmpFiles: Array<object> = [];

    // 区分目录和文件
    beforSortFiles.forEach(target => {
        let fullPath = path.join(trgPath, target.toString());
        if (fs.statSync(fullPath).isDirectory()) {
            paths.push(target);
        } else {
            tmpFiles.push(target);
        }
    });
    paths = paths.concat(tmpFiles);

    // 生成Mermaid格式的流程图文本
    paths.forEach(item => {
        let fullPath = path.join(trgPath, item.toString());
        let nodeName = path.basename(fullPath);  // 节点名称
        if (parent) {
            graphText += `    ${parent} --> ${nodeName}\n`;  // 连接父节点到当前节点
        }

        if (fs.statSync(fullPath).isDirectory()) {
            graphText += entryGraph(fullPath, deps + 1, nodeName);
        }
    });

    return graphText;
}

class OutputElements {
    static Template = `
    <html>
      <head>
      <style>
      .btn-ftg {
        position: relative;
        display: inline-block;
        padding: 0.25em 0.5em;
        text-decoration: none;
        color: #FFF;
        background: #3595fd;
        border-bottom: solid 2px #007dd2;
        border-radius: 4px;
        box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), 0 2px 2px rgba(0, 0, 0, 0.19);
        font-weight: bold;
        -webkit-user-select: none;
        -moz-user-select: none;
         -ms-user-select: none;
             user-select: none;

        &:active {
          border-bottom: solid 2px #3595fd;
          box-shadow: 0 0 2px rgba(0, 0, 0, 0.30);
        }
      }
      </style>
      </head>
      <body>
        <div class="head">
          <div id="icon-switch" class="btn-ftg"
           onclick="switchVisibility();">
          icon off
          </div>
		  <div id="view-switch" class="btn-ftg" onclick="toggleView();">
            Switch to Graph View
          </div>
		  <div id="save-button" class="btn-ftg" onclick="saveMindMap();">
			Save MindMap.md
			</div>
        </div>
        <pre id="tree-panel" class="content-panel">--TREE--</pre>
    	<pre id="graph-panel" class="content-panel hidden">--GRAPH--</pre>
        <script type="text/javascript">
			const vscode = acquireVsCodeApi();

            function switchVisibility() {
                var mode = document.getElementById("icon-switch").textContent;
                var iconList = document.getElementsByName("icons");
                var visible = "inline";
                if (mode != 'icon on') {
                    document.getElementById("icon-switch").textContent = 'icon on'
                    visible = "none";
                } else {
                    document.getElementById("icon-switch").textContent = 'icon off'
                }
                iconList.forEach(icon => {
                    icon.style.display = visible;
                })
                window.focus();
            }

			function toggleView() {
				var treePanel = document.getElementById("tree-panel");
				var graphPanel = document.getElementById("graph-panel");
				var btn = document.getElementById("view-switch");
			
				if (treePanel.style.display !== 'none') {
					treePanel.style.display = 'none';
					graphPanel.style.display = 'block';
					btn.textContent = 'Switch to Tree View';
				} else {
					treePanel.style.display = 'block';
					graphPanel.style.display = 'none';
					btn.textContent = 'Switch to Graph View';
				}
			}
			function saveMindMap() {
				console.log("Saving MindMap");  // 在浏览器控制台中查看或使用下面的方式在VSCode中显示
				vscode.postMessage({
					command: 'saveMindMap',
					text: document.getElementById('graph-panel').textContent
				});
				vscode.window.showInformationMessage('Save button clicked'); // 确认按钮点击事件
			}
			
        </script>
      </body>
    </html>
    `;
}