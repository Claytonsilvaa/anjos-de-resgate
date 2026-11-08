
const CONFIG = { modo: "mockapi", apiBase: "https://6af0eae011a6aa866e7fd40f.mockapi.io/api/v1", arquivoAnimais: "api/animais.json" };


const animaisLocais = [
    {
        "id": "max",
        "codigo": "104",
        "nome": "MAX",
        "especie": "Cão",
        "especieDetalhe": "Cão (SRD)",
        "sexo": "Macho",
        "iconeSexo": "fi-rr-mars",
        "iconeEspecie": "fi-rr-dog",
        "porte": "Médio",
        "iconePorte": "fi-rr-expand-arrows",
        "idadeCategoria": "Adulto",
        "idadeMeses": 36,
        "idadeTexto": "3 anos",
        "foto": "img/Max.jpg",
        "historico": "Resgatado em situação de risco. Avaliação comportamental revela um cão de energia estável e alta sociabilidade. Ideal para infraestrutura habitacional fechada e convivência familiar.",
        "saude": [
            "Vacinado",
            "Vermifugado",
            "Castrado"
        ],
        "criadoEm": "2026-11-03T12:00:00.000Z"
    },
    {
        "id": "luna",
        "codigo": "209",
        "nome": "LUNA",
        "especie": "Gato",
        "especieDetalhe": "Gato (SRD)",
        "sexo": "Fêmea",
        "iconeSexo": "fi-rr-venus",
        "iconeEspecie": "fi-rr-cat",
        "porte": "Pequeno",
        "iconePorte": "fi-rr-compress-arrows",
        "idadeCategoria": "Filhote",
        "idadeMeses": 8,
        "idadeTexto": "8 meses",
        "foto": "img/Luna.jpg",
        "historico": "Resgatada ainda ninhada e socializada em lar temporário clínico. Apresenta adaptação imediata a ambientes internos telados, uso rigoroso de caixa sanitária e temperamento dócil.",
        "saude": [
            "Vacinada",
            "Vermifugada"
        ],
        "criadoEm": "2026-11-02T12:00:00.000Z"
    },
    {
        "id": "duque",
        "codigo": "312",
        "nome": "DUQUE",
        "especie": "Cão",
        "especieDetalhe": "Cão (SRD)",
        "sexo": "Macho",
        "iconeSexo": "fi-rr-mars",
        "iconeEspecie": "fi-rr-dog",
        "porte": "Grande",
        "iconePorte": "fi-rr-expand-arrows",
        "idadeCategoria": "Idoso",
        "idadeMeses": 84,
        "idadeTexto": "7 anos",
        "foto": "img/Duque.jpg",
        "historico": "Cão sênior de porte imponente e comportamento extremamente calmo. Já passou por reabilitação completa, caminha sem tracionar a guia e busca uma família tranquila.",
        "saude": [
            "Vacinado",
            "Vermifugado",
            "Castrado"
        ],
        "criadoEm": "2026-11-01T12:00:00.000Z"
    }
];


const Api = {
    async requisicao(caminho, opcoes = {}) {
        const base = CONFIG.apiBase.trim().replace(/\/+$/, "");
        if (base.startsWith("https://") === false) {
            throw new Error("Preencha apiBase no início de js/script.js com a URL HTTPS do MockAPI.");
        }
        opcoes.headers = { "Content-Type": "application/json" };
        const resposta = await fetch(base + caminho, opcoes);
        if (resposta.ok === false) {
            throw new Error("Erro " + resposta.status + " no MockAPI.");
        }
        if (resposta.status === 204) {
            return null;
        }
        return await resposta.json();
    },

    async listarAnimais() {
        let dados;
        if (CONFIG.modo === "mockapi") {
            dados = await this.requisicao("/animais");
        } else if (CONFIG.modo === "local") {
            // O navegador bloqueia fetch de arquivos abertos com duplo clique.
            // Nesse caso usamos a lista que está no início deste arquivo.
            if (typeof location !== "undefined" && location.protocol === "file:") {
                dados = animaisLocais;
            } else {
                const resposta = await fetch(CONFIG.arquivoAnimais);
                if (resposta.ok === false) {
                    throw new Error("Não foi possível abrir o JSON local.");
                }
                dados = await resposta.json();
            }
        } else {
            throw new Error("Modo inválido no início de script.js.");
        }
        if (Array.isArray(dados) === false) {
            throw new Error("A lista de animais precisa ser um array.");
        }
        const ids = [];
        for (let i = 0; i < dados.length; i++) {
            const animal = dados[i];
            if (!animal || !animal.id || !animal.nome || ids.includes(String(animal.id))) {
                throw new Error("Animal inválido ou ID repetido.");
            }
            ids.push(String(animal.id));
        }
        return dados;
    },

    async salvarAdocao(pedido) {
        if (CONFIG.modo === "mockapi") {
            const resposta = await this.requisicao("/adocoes", {
                method: "POST",
                body: JSON.stringify(pedido)
            });
            if (!resposta || !resposta.id) {
                throw new Error("A API não confirmou o protocolo.");
            }
            return resposta;
        }
        if (CONFIG.modo !== "local") {
            throw new Error("Modo inválido no início de script.js.");
        }
        const chave = "anjos-resgate-adocoes-teste";
        const pedidos = JSON.parse(localStorage.getItem(chave) || "[]");
        if (Array.isArray(pedidos) === false) {
            throw new Error("Dados locais inválidos.");
        }

        pedido.id = "local-" + Date.now() + "-" + pedidos.length;
        pedidos.push(pedido);
        localStorage.setItem(chave, JSON.stringify(pedidos));
        return pedido;
    }
};


const modal = document.getElementById("modal-adocao");
const etapaFormulario = modal.querySelectorAll(":scope > section")[0];
const etapaSucesso = modal.querySelectorAll(":scope > section")[1];
const formulario = modal.querySelector("form");
const nomeAdotante = document.getElementById("nome-adotante");
const telefone = document.getElementById("telefone-adotante");
const enviar = formulario.querySelector('button[type="submit"]');
const avisoAdocao = document.createElement("p");
avisoAdocao.setAttribute("role", "status");
etapaFormulario.appendChild(avisoAdocao);
etapaSucesso.hidden = true;
let animalSelecionado = null;
let enviando = false;


function abrirModalAdocao(animal) {
    animalSelecionado = animal;
    formulario.reset();
    nomeAdotante.setCustomValidity("");
    telefone.setCustomValidity("");
    avisoAdocao.textContent = "Use dados fictícios. Este é um teste da faculdade.";
    document.getElementById("nome-animal-selecionado").textContent = animal.nome;
    etapaFormulario.hidden = false;
    etapaSucesso.hidden = true;
    modal.showModal();
    nomeAdotante.focus();
}


document.querySelector("main").addEventListener("click", function (evento) {
    const botao = evento.target.closest(".btn-adotar");
    if (botao === null) {
        return;
    }
    const animal = {
        id: botao.dataset.id || "",
        nome: botao.dataset.animal
    };
    abrirModalAdocao(animal);
});

function fecharAdocao() {
    if (enviando === false) {
        modal.close();
    }
}
modal.querySelector('[aria-label="Fechar formulário"]').addEventListener("click", fecharAdocao);
modal.addEventListener("cancel", function (evento) {
    if (enviando) {
        evento.preventDefault();
    }
});
etapaSucesso.querySelector("button").addEventListener("click", function () {
    modal.close();
    location.hash = "catalogo";
});
nomeAdotante.addEventListener("input", function () {
    nomeAdotante.setCustomValidity("");
});
telefone.addEventListener("input", function () {
    telefone.setCustomValidity("");
});


async function confirmarSolicitacaoAdocao(evento) {
    evento.preventDefault();
    if (enviando || animalSelecionado === null) {
        return;
    }

    const nome = nomeAdotante.value.trim();
 
    const numero = telefone.value.replace(/\D/g, "");
    if (nome.split(/\s+/).length < 2) {
        nomeAdotante.setCustomValidity("Digite nome e sobrenome.");
    }
    if (numero.length !== 10 && numero.length !== 11) {
        telefone.setCustomValidity("Digite o DDD e o telefone (10 ou 11 números).");
    }
    if (formulario.reportValidity() === false) {
        return;
    }

    if (animalSelecionado.id === "") {
        avisoAdocao.textContent = "A lista não foi carregada. Confira a conexão/configuração e reabra a ficha antes de enviar.";
        return;
    }

    const pedido = {
        animalId: animalSelecionado.id,
        animalNome: animalSelecionado.nome,
        nomeAdotante: nome,
        telefone: numero,
        tipoImovel: document.getElementById("tipo-imovel").value,
        status: "pendente",
        criadoEm: new Date().toISOString()
    };
    enviando = true;
    enviar.disabled = true;
    enviar.textContent = "Enviando...";

    try {
        const resposta = await Api.salvarAdocao(pedido);
        etapaFormulario.hidden = true;
        etapaSucesso.hidden = false;
        etapaSucesso.querySelector("h3").textContent = "Solicitação de teste salva";
        let texto = "Protocolo: " + resposta.id + ". ";
        if (CONFIG.modo === "local") {
            texto = texto + "Salvo somente neste navegador. Não foi enviado à ONG.";
        } else {
            texto = texto + "Salvo no MockAPI. Não haverá contato real da ONG.";
        }
        etapaSucesso.querySelector("p").textContent = texto;
        etapaSucesso.querySelector("button").focus();
    } catch (erro) {
        avisoAdocao.textContent = "Não foi possível confirmar o envio. " + erro.message + " Confira os registros antes de tentar novamente.";
    } finally {
        enviando = false;
        enviar.disabled = false;
        enviar.textContent = "Enviar Inquérito de Adoção";
    }
}
formulario.addEventListener("submit", confirmarSolicitacaoAdocao);


const lista = document.querySelector(".lista-animais");
const modeloCard = lista.querySelector("article").cloneNode(true);
const modeloFicha = document.getElementById("detalhes-max").cloneNode(true);
const filtros = document.getElementById("form-filtros");
const menu = document.querySelector("main > aside");
const abrirFiltros = document.querySelector(".titulo-catalogo > button");
const busca = document.querySelector('input[name="busca"]');
const estado = document.createElement("p");
estado.setAttribute("role", "status");
document.querySelector(".titulo-catalogo").appendChild(estado);
let animais = [];

function normalizar(texto) {
   
    return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function preencherFoto(imagem, animal) {
    const caminho = String(animal.foto || "");
    imagem.alt = "Foto de " + animal.nome;
    if (caminho.startsWith("img/") || caminho.startsWith("https://") || caminho.startsWith("http://")) {
        imagem.src = caminho;
    } else {
        imagem.removeAttribute("src");
    }
    imagem.onerror = function () {
        imagem.removeAttribute("src");
        imagem.alt = "Foto indisponível: " + animal.nome;
    };
}

function preencherCaracteristicas(ul, animal, fichaCompleta) {
    let idade = animal.idadeCategoria;
    if (fichaCompleta) {
        idade = animal.idadeTexto;
    }
    const valores = [animal.especie, animal.sexo, animal.porte, idade];
    const icones = ["dog", "mars", "ruler-horizontal", "calendar"];
    if (animal.especie === "Gato") {
        icones[0] = "cat";
    }
    if (animal.sexo === "Fêmea") {
        icones[1] = "venus";
    }
    ul.replaceChildren();
    for (let i = 0; i < valores.length; i++) {
        const item = document.createElement("li");
        const icone = document.createElement("i");
        icone.className = "fi fi-rr-" + icones[i];
        icone.setAttribute("aria-hidden", "true");
        item.appendChild(icone);
        item.appendChild(document.createTextNode(" " + (valores[i] || "Não informado")));
        ul.appendChild(item);
    }
}


function criarFichas() {
    const antigas = document.querySelectorAll('main > section[id^="detalhes-"]');
    for (let i = 0; i < antigas.length; i++) {
        antigas[i].remove();
    }
    for (let i = 0; i < animais.length; i++) {
        const animal = animais[i];
        const ficha = modeloFicha.cloneNode(true);
        const id = "detalhes-" + encodeURIComponent(animal.id);
        ficha.id = id;
        ficha.setAttribute("aria-labelledby", "nome-" + id);
        const titulo = ficha.querySelector("h1");
        titulo.id = "nome-" + id;
        titulo.textContent = animal.nome;
        titulo.nextElementSibling.textContent = "Código PETEC #" + (animal.codigo || animal.id);
        preencherFoto(ficha.querySelector("figure img"), animal);
        preencherCaracteristicas(ficha.querySelector("article > ul"), animal, true);

        const saude = ficha.querySelector('[aria-labelledby^="saude-"]');
        saude.setAttribute("aria-labelledby", "saude-" + id);
        saude.querySelector("h2").id = "saude-" + id;
        const listaSaude = saude.querySelector("ul");
        listaSaude.replaceChildren();
        let cuidados = animal.saude;
        if (!Array.isArray(cuidados) || cuidados.length === 0) {
            cuidados = ["Não informado"];
        }
        for (let j = 0; j < cuidados.length; j++) {
            const item = document.createElement("li");
            item.textContent = cuidados[j];
            listaSaude.appendChild(item);
        }

        const historico = ficha.querySelector('[aria-labelledby^="historico-"]');
        historico.setAttribute("aria-labelledby", "historico-" + id);
        historico.querySelector("h2").id = "historico-" + id;
        historico.querySelector("h2").textContent = "O Histórico";
        historico.querySelector("p").textContent = animal.historico || "Não informado.";
        const botao = ficha.querySelector(".btn-adotar");
        botao.dataset.id = animal.id;
        botao.dataset.animal = animal.nome;
        botao.textContent = "Quero adotar: " + animal.nome;
        document.getElementById("modal-adocao").before(ficha);
    }
}


function valorMarcado(nome) {
    const campo = filtros.querySelector('input[name="' + nome + '"]:checked');
    if (campo === null) {
        return "";
    }
    return campo.value;
}

function mostrarAnimais() {
    const encontrados = [];
    const nome = normalizar(busca.value.trim());
    const porte = valorMarcado("porte");
    const especie = valorMarcado("especie");
    const idade = valorMarcado("idade");
    const ordem = valorMarcado("ordenacao");

    for (let i = 0; i < animais.length; i++) {
        const animal = animais[i];
        let mostrar = true;
        if (!normalizar(animal.nome).includes(nome)) {
            mostrar = false;
        }
        if (porte !== "" && animal.porte !== porte) {
            mostrar = false;
        }
        if (especie !== "" && especie !== "Ambas" && animal.especie !== especie) {
            mostrar = false;
        }
        if (idade !== "" && animal.idadeCategoria !== idade) {
            mostrar = false;
        }
        if (mostrar) {
            encontrados.push(animal);
        }
    }

    if (ordem === "idade-asc") {
        encontrados.sort(function (a, b) { return a.idadeMeses - b.idadeMeses; });
    } else if (ordem === "idade-desc") {
        encontrados.sort(function (a, b) { return b.idadeMeses - a.idadeMeses; });
    } else if (ordem === "nome-asc") {
        encontrados.sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
    } else {
        encontrados.sort(function (a, b) {
            return (Date.parse(b.criadoEm) || 0) - (Date.parse(a.criadoEm) || 0);
        });
    }

    lista.replaceChildren();
    for (let i = 0; i < encontrados.length; i++) {
        const animal = encontrados[i];
        const card = modeloCard.cloneNode(true);
        card.querySelector("h2").textContent = animal.nome;
        preencherFoto(card.querySelector("img"), animal);
        preencherCaracteristicas(card.querySelector("ul"), animal, false);
        card.querySelector("a").href = "#detalhes-" + encodeURIComponent(animal.id);
        lista.appendChild(card);
    }
    document.querySelector(".titulo-catalogo sup").textContent = encontrados.length;
    estado.textContent = "";
    if (encontrados.length === 0) {
        estado.textContent = "Nenhum animal encontrado. Tente limpar os filtros.";
    }
}


function fecharMenu() {
    menu.classList.remove("aberto");
    menu.inert = true;
    abrirFiltros.setAttribute("aria-expanded", "false");
    abrirFiltros.focus();
}
menu.inert = true;
abrirFiltros.setAttribute("aria-expanded", "false");
abrirFiltros.addEventListener("click", function () {
    menu.inert = false;
    menu.classList.add("aberto");
    abrirFiltros.setAttribute("aria-expanded", "true");
    menu.querySelector("button").focus();
});
menu.querySelector('[aria-label="Fechar menu"]').addEventListener("click", fecharMenu);
document.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && menu.classList.contains("aberto")) {
        fecharMenu();
    }
});
filtros.addEventListener("change", mostrarAnimais);
filtros.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mostrarAnimais();
    fecharMenu();
});
filtros.addEventListener("reset", function () {
    busca.value = "";

    setTimeout(mostrarAnimais, 0);
});
busca.addEventListener("input", mostrarAnimais);
busca.form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    mostrarAnimais();
    location.hash = "catalogo";
});


async function iniciar() {
    estado.textContent = "Carregando animais...";
    try {
        animais = await Api.listarAnimais();
        criarFichas();
        mostrarAnimais();
    } catch (erro) {
        estado.textContent = "Não foi possível carregar os dados. " + erro.message;
        const tentar = document.createElement("button");
        tentar.textContent = "Tentar novamente";
        tentar.addEventListener("click", iniciar);
        estado.appendChild(tentar);
    }
}
iniciar();
