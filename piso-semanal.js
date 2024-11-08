// ==UserScript==
// @name         Procurar Tabela
// @namespace    http://tampermonkey.net/
// @version      2024-11-08
// @description  Procura por uma tabela dentro de uma div específica após clique em botão e com atraso de 5 segundos antes de iniciar o processo principal, observando o DOM para mudanças dinâmicas
// @author
// @match        https://siccau.caubr.gov.br/app/view/sight/ini.php?form=Pessoal&usuario=nick.silva
// @icon         https://www.google.com/s2/favicons?sz=64&domain=microsoft.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    async function executarProcesso() {
        const divSolicitacoes = document.getElementById('ResultAjax_SolicitacoesPJPendente');
        if (!divSolicitacoes) {
            alert("Div ResultAjax_SolicitacoesPJPendente não encontrada.");
            return;
        }

        const tabela = divSolicitacoes.querySelector('table');
        if (!tabela) {
            alert("Tabela não encontrada dentro da div.");
            return;
        }

        console.log("Tabela encontrada!");

        const resultados = [];

        for (let i = 1; i <= 3 && i < tabela.rows.length; i++) {
            const linha = tabela.rows[i];
            const ultimaColuna = linha.cells[linha.cells.length - 1];
            const linkElemento = ultimaColuna.querySelector('a');

            if (linkElemento) {
                const link = linkElemento.href;
                console.log(`Acessando link da linha ${i + 1}: ${link}`);

                const datas = await extrairDatasDoLink(link);
                if (datas.length > 0) {
                    const maiorData = obterMaiorData(datas);
                    resultados.push({ linha: i + 1, link, datas, maiorData });
                } else {
                    console.log(`Nenhuma data encontrada ou erro ao acessar o link da linha ${i + 1}. Pulando para a próxima linha.`);
                }

                const intervalo = Math.floor(Math.random() * (9000 - 3000 + 1)) + 3000;
                console.log(`Aguardando ${intervalo / 1000} segundos antes da próxima requisição.`);
                await new Promise(resolve => setTimeout(resolve, intervalo));
            } else {
                console.log(`Nenhum link encontrado na linha ${i + 1}`);
            }
        }

        gerarArquivo(resultados);
    }

    async function extrairDatasDoLink(link) {
        link = link.replace(/^http:\/\//i, 'https://');

        try {
            const response = await fetch(link);
            if (!response.ok) throw new Error(`Status de resposta: ${response.status}`);

            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const regexData = /\b(\d{2})\/(\d{2})\/(\d{4})\b/g;
            const datas = [];
            let match;

            while ((match = regexData.exec(doc.body.innerHTML)) !== null) {
                datas.push(`${match[1]}/${match[2]}/${match[3]}`);
            }

            return datas;
        } catch (error) {
            console.error(`Erro ao acessar ${link}:`, error);
            return [];
        }
    }

    function obterMaiorData(datas) {
        return datas.reduce((maior, atual) => {
            const [diaMaior, mesMaior, anoMaior] = maior.split('/').map(Number);
            const [diaAtual, mesAtual, anoAtual] = atual.split('/').map(Number);

            const dateMaior = new Date(anoMaior, mesMaior - 1, diaMaior);
            const dateAtual = new Date(anoAtual, mesAtual - 1, diaAtual);

            return dateAtual > dateMaior ? atual : maior;
        });
    }

    function gerarArquivo(resultados) {
        let conteudo = "Linha\tLink\tDatas Encontradas\tMaior Data\n";

        resultados.forEach(resultado => {
            conteudo += `${resultado.linha}\t${resultado.link}\t${resultado.datas.join(', ')}\t${resultado.maiorData}\n`;
        });

        const blob = new Blob([conteudo], { type: 'text/plain' });
        const linkDownload = document.createElement('a');
        linkDownload.href = URL.createObjectURL(blob);
        linkDownload.download = 'resultados_tabela.txt';
        linkDownload.click();
    }

    function iniciarObservador() {
        const observer = new MutationObserver(() => {
            const botao = document.getElementById('mostrarSolicitacoesPJPendente');
            if (botao) {
                botao.addEventListener('click', () => {
                    setTimeout(executarProcesso, 5000); // Espera 5 segundos após o clique para iniciar o processo
                });
                observer.disconnect(); // Interrompe a observação após encontrar o elemento
                console.log("Observador desconectado, botão encontrado e evento adicionado.");
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    iniciarObservador();

})();