require('dotenv').config();
const express = require('express');
const PagBank = require('pagbank-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { htmlToText } = require('html-to-text');

// Inicialização do app
const app = express();

// Configurações de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Limitação de taxa
const limitador = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições deste IP, por favor tente novamente mais tarde'
});
app.use('/auth', limitador);

// Configuração do PagBank
const clientePagBank = new PagBank({
  client_id: process.env.PAGBANK_CLIENT_ID,
  client_secret: process.env.PAGBANK_CLIENT_SECRET,
  sandbox: process.env.NODE_ENV !== 'production'
});

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
}).then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro no MongoDB:', err));

// Modelos
const UsuarioSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: 'Por favor, forneça um e-mail válido'
    }
  },
  senha: { type: String, required: true },
  nome: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
  tokenResetSenha: String,
  expiracaoResetSenha: Date,
  tokensRefresh: [{
    token: String,
    expiraEm: Date
  }]
}, {
  toJSON: {
    transform: function(doc, ret) {
      delete ret.senha;
      delete ret.tokensRefresh;
      delete ret.tokenResetSenha;
      delete ret.expiracaoResetSenha;
    }
  }
});

UsuarioSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 12);
  next();
});

UsuarioSchema.methods.criarTokenAcesso = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRA_EM || '15m'
  });
};

UsuarioSchema.methods.criarTokenRefresh = async function() {
  const tokenRefresh = jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRA_EM || '7d'
  });
  
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + 7);
  
  this.tokensRefresh = this.tokensRefresh.concat({
    token: tokenRefresh,
    expiraEm
  });
  
  await this.save();
  return tokenRefresh;
};

UsuarioSchema.methods.verificarTokenRefresh = function(token) {
  try {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const tokenExiste = this.tokensRefresh.some(
      t => t.token === token && t.expiraEm > new Date()
    );
    return tokenExiste;
  } catch (err) {
    return false;
  }
};

UsuarioSchema.methods.revogarTokenRefresh = async function(token) {
  this.tokensRefresh = this.tokensRefresh.filter(t => t.token !== token);
  await this.save();
};

const Usuario = mongoose.model('Usuario', UsuarioSchema);

// Modelo de Pagamento para PagBank
const PagamentoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  idPedido: { type: String, required: true, unique: true, index: true },
  idCobranca: { type: String },
  itens: [{
    idReferencia: String,
    nome: String,
    valorUnitario: Number,
    quantidade: Number,
    descricao: String
  }],
  status: { 
    type: String, 
    enum: ['pendente', 'aprovado', 'cancelado', 'reembolsado', 'falhou'],
    default: 'pendente'
  },
  metodoPagamento: String,
  respostaPagBank: mongoose.Schema.Types.Mixed,
  notificacaoPagBank: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Pagamento = mongoose.model('Pagamento', PagamentoSchema);

// Configuração de e-mail
const transportador = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USUARIO || process.env.SENDGRID_USUARIO || 'apikey',
    pass: process.env.SMTP_SENHA || process.env.SENDGRID_SENHA
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

async function enviarEmail(para, assunto, conteudoHtml) {
  const opcoesEmail = {
    from: process.env.EMAIL_DE,
    replyTo: process.env.EMAIL_RESPONDER_PARA || process.env.EMAIL_DE,
    to: para,
    subject: assunto,
    html: conteudoHtml,
    text: htmlToText(conteudoHtml),
    headers: {
      'X-Priority': '1',
      'X-Mailer': 'KiDeliMailer/1.0'
    }
  };

  try {
    const info = await transportador.sendMail(opcoesEmail);
    console.log(`E-mail enviado para ${para}`);
    return { sucesso: true, idMensagem: info.messageId };
  } catch (erro) {
    console.error('Falha ao enviar e-mail:', erro);
    return { 
      sucesso: false, 
      erro: 'Falha ao enviar e-mail',
      detalhes: erro.message 
    };
  }
}

// Middleware
const autenticar = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Token de acesso não fornecido'
    });
  }

  try {
    const decodificado = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(decodificado.id);
    
    if (!usuario) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Usuário não encontrado'
      });
    }

    req.usuario = usuario;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        erro: 'Token expirado',
        codigo: 'TOKEN_EXPIRADO'
      });
    }
    
    return res.status(401).json({
      sucesso: false,
      erro: 'Token inválido'
    });
  }
};

// Rotas de Autenticação
app.post('/auth/registrar', [
  body('email').isEmail().normalizeEmail(),
  body('senha').isLength({ min: 8 }).withMessage('A senha deve ter no mínimo 8 caracteres'),
  body('nome').notEmpty().trim().escape().withMessage('Nome é obrigatório')
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({
      sucesso: false,
      erros: erros.array()
    });
  }

  try {
    const { email, senha, nome } = req.body;
    
    if (await Usuario.findOne({ email })) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Este e-mail já está cadastrado'
      });
    }

    const usuario = await Usuario.create({ email, senha, nome });
    const tokenAcesso = usuario.criarTokenAcesso();
    const tokenRefresh = await usuario.criarTokenRefresh();

    res.status(201).json({
      sucesso: true,
      dados: {
        tokens: { acesso: tokenAcesso, refresh: tokenRefresh },
        usuario: { id: usuario._id, email: usuario.email, nome: usuario.nome }
      }
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao criar conta'
    });
  }
});

app.post('/api/verificar-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Por favor, forneça um e-mail válido'
      });
    }

    const existe = await Usuario.exists({ email });
    res.status(200).json({
      sucesso: true,
      dados: { registrado: existe }
    });
  } catch (err) {
    console.error('Erro ao verificar e-mail:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao verificar e-mail'
    });
  }
});

app.post('/api/enviar-recuperacao', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Por favor, forneça um e-mail válido'
      });
    }

    const usuario = await Usuario.findOne({ email });

    if (!usuario) {
      console.log(`Tentativa de recuperação para e-mail não cadastrado: ${email}`);
      return res.status(200).json({ 
        sucesso: false,
        erro: 'Nenhuma conta encontrada com este endereço de e-mail'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    usuario.tokenResetSenha = token;
    usuario.expiracaoResetSenha = Date.now() + 3600000;
    await usuario.save();

    const urlReset = `${process.env.FRONTEND_URL}/resetar-senha?token=${token}`;
    
    const resultadoEmail = await enviarEmail(
      usuario.email,
      'Redefinição de Senha - KiDeli',
      `
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no link abaixo para continuar:</p>
        <a href="${urlReset}">Redefinir senha</a>
        <p><small>Se você não solicitou esta alteração, por favor ignore este e-mail.</small></p>
        <p><small>Este link expira em 1 hora.</small></p>
      `
    );

    if (!resultadoEmail.sucesso) {
      throw new Error('Falha no envio do e-mail');
    }

    console.log(`E-mail de recuperação enviado para: ${usuario.email}`);

    res.status(200).json({
      sucesso: true,
      mensagem: 'E-mail de recuperação enviado com sucesso'
    });

  } catch (err) {
    console.error('Erro no processo de recuperação:', {
      erro: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      sucesso: false,
      erro: 'Ocorreu um erro ao processar sua solicitação'
    });
  }
});

app.post('/api/resetar-senha', async (req, res) => {
  try {
    const { token, novaSenha } = req.body;
    
    if (!token || !novaSenha || novaSenha.length < 8) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Token e nova senha (mínimo 8 caracteres) são obrigatórios'
      });
    }

    const usuario = await Usuario.findOne({
      tokenResetSenha: token,
      expiracaoResetSenha: { $gt: Date.now() }
    });

    if (!usuario) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Token inválido ou expirado'
      });
    }

    usuario.senha = await bcrypt.hash(novaSenha, 12);
    usuario.tokenResetSenha = undefined;
    usuario.expiracaoResetSenha = undefined;
    await usuario.save();

    res.status(200).json({
      sucesso: true,
      mensagem: 'Senha redefinida com sucesso'
    });
  } catch (err) {
    console.error('Erro ao resetar senha:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao redefinir senha'
    });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: 'E-mail e senha são obrigatórios'
      });
    }

    const usuario = await Usuario.findOne({ email }).select('+senha');
    
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Credenciais inválidas'
      });
    }

    const tokenAcesso = usuario.criarTokenAcesso();
    const tokenRefresh = await usuario.criarTokenRefresh();

    res.status(200).json({
      sucesso: true,
      dados: {
        tokens: { acesso: tokenAcesso, refresh: tokenRefresh },
        usuario: { id: usuario._id, email: usuario.email, nome: usuario.nome }
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao fazer login'
    });
  }
});

app.post('/auth/logout', autenticar, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await req.usuario.revogarTokenRefresh(token);
    
    res.status(200).json({
      sucesso: true,
      mensagem: 'Logout realizado com sucesso'
    });
  } catch (err) {
    console.error('Erro ao fazer logout:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao fazer logout'
    });
  }
});

app.post('/auth/refresh', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      sucesso: false,
      erro: 'Token não fornecido'
    });
  }

  try {
    const decodificado = jwt.decode(token);
    if (!decodificado?.id) {
      throw new Error('Token inválido');
    }
    
    const usuario = await Usuario.findById(decodificado.id);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }
    
    if (!usuario.verificarTokenRefresh(token)) {
      throw new Error('Token inválido');
    }
    
    await usuario.revogarTokenRefresh(token);
    
    const novoTokenAcesso = usuario.criarTokenAcesso();
    const novoTokenRefresh = await usuario.criarTokenRefresh();
    
    res.status(200).json({
      sucesso: true,
      dados: {
        tokens: { acesso: novoTokenAcesso, refresh: novoTokenRefresh }
      }
    });
  } catch (err) {
    console.error('Erro ao renovar token:', err);
    res.status(401).json({
      sucesso: false,
      erro: err.message || 'Token inválido ou expirado'
    });
  }
});

// Rotas de Pagamento com PagBank
app.post('/api/v1/pagamentos/criar-pedido', autenticar, [
  body('itens').isArray({ min: 1 }).withMessage('Pelo menos um item é necessário'),
  body('metodoPagamento').isIn(['CARTAO_CREDITO', 'PIX', 'BOLETO']),
  body('cartao').optional().isObject()
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({
      sucesso: false,
      erros: erros.array()
    });
  }

  try {
    const { itens, metodoPagamento, cartao } = req.body;

    // Formata os itens para o padrão PagBank
    const itensPedido = itens.map(item => ({
      id_referencia: item.id || crypto.randomUUID(),
      nome: item.nome,
      quantidade: Number(item.quantidade),
      valor_unitario: Math.round(Number(item.preco) * 100), // Em centavos
      descricao: item.descricao || ''
    }));

    // Calcula o valor total
    const valorTotal = itensPedido.reduce((soma, item) => 
      soma + (item.valor_unitario * item.quantidade), 0);

    // Cria a requisição de pagamento
    const requisicaoPagamento = {
      id_referencia: `pedido_${Date.now()}`,
      cliente: {
        nome: req.usuario.nome,
        email: req.usuario.email
      },
      itens: itensPedido,
      endereco_entrega: {
        logradouro: 'Av. PagBank',
        numero: '1234',
        complemento: 'Sala 01',
        bairro: 'Bairro PagBank',
        cidade: 'São Paulo',
        estado: 'SP',
        pais: 'BRA',
        cep: '01452002'
      },
      urls_notificacao: [
        `${process.env.API_URL}/api/v1/pagamentos/webhook`
      ],
      cobrancas: [{
        id_referencia: `cobranca_${Date.now()}`,
        descricao: 'Pagamento via KiDeli',
        valor: {
          total: valorTotal,
          moeda: 'BRL'
        },
        metodo_pagamento: {
          tipo: metodoPagamento,
          parcelas: 1,
          capturar: true,
          ...(metodoPagamento === 'CARTAO_CREDITO' && { cartao: {
            tokenizado: cartao.token
          }})
        }
      }]
    };

    const resposta = await clientePagBank.pedidos.criar(requisicaoPagamento);

    // Salva o pagamento no banco de dados
    await Pagamento.create({
      usuario: req.usuario._id,
      idPedido: resposta.id,
      idCobranca: resposta.cobrancas?.[0]?.id,
      itens: itensPedido,
      metodoPagamento,
      status: 'pendente',
      respostaPagBank: resposta
    });

    res.status(200).json({
      sucesso: true,
      dados: {
        id: resposta.id,
        url_pagamento: resposta.links.find(link => link.rel === 'PAGAR')?.href
      }
    });
  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao processar pagamento',
      detalhes: err.response?.data || err.message
    });
  }
});

// Webhook PagBank
app.post('/api/v1/pagamentos/webhook', express.json(), async (req, res) => {
  try {
    const assinatura = req.headers['pagbank-assinatura'];
    if (!clientePagBank.verificarAssinaturaWebhook(assinatura, req.body)) {
      console.warn('Tentativa de webhook com assinatura inválida');
      return res.status(403).send('Assinatura inválida');
    }

    const { evento, recurso } = req.body;
    const idPagamento = recurso.pagamento?.id || recurso.pedido?.id;

    if (!idPagamento) {
      return res.status(400).send('ID do pagamento não encontrado');
    }

    // Atualiza o status do pagamento
    const pagamento = await Pagamento.findOne({ 
      $or: [{ idPedido: idPagamento }, { idCobranca: idPagamento }] 
    });
    
    if (!pagamento) {
      console.warn(`Pagamento não encontrado: ${idPagamento}`);
      return res.status(404).send('Pagamento não encontrado');
    }

    // Mapeia os eventos do PagBank para os status do sistema
    const mapeamentoStatus = {
      'PAGAMENTO_CRIADO': 'pendente',
      'PAGAMENTO_CONFIRMADO': 'aprovado',
      'PAGAMENTO_CANCELADO': 'cancelado',
      'PAGAMENTO_REEMBOLSADO': 'reembolsado',
      'PAGAMENTO_FALHOU': 'falhou'
    };

    pagamento.status = mapeamentoStatus[evento] || pagamento.status;
    pagamento.notificacaoPagBank = req.body;
    await pagamento.save();

    res.status(200).send('OK');
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.status(500).send('Erro interno no servidor');
  }
});

// Rotas adicionais
app.get('/api/v1/me', autenticar, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-senha');
    res.status(200).json({
      sucesso: true,
      dados: { usuario }
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao buscar dados do usuário'
    });
  }
});

app.put('/api/v1/perfil', autenticar, [
  body('email').optional().isEmail().withMessage('E-mail inválido'),
  body('nome').optional().trim().escape(),
  body('telefone').optional().trim().escape()
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({
      sucesso: false,
      erros: erros.array()
    });
  }

  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.usuario.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-senha');

    res.status(200).json({
      sucesso: true,
      dados: { usuario }
    });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Erro ao atualizar perfil'
    });
  }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.stack);
  res.status(500).json({
    sucesso: false,
    erro: 'Erro interno no servidor'
  });
});

// Iniciar servidor
const PORTA = process.env.PORTA || 3000;
app.listen(PORTA, () => {
  console.log(`Servidor rodando na porta ${PORTA} em modo ${process.env.NODE_ENV || 'desenvolvimento'}`);
});