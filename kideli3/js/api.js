require('dotenv').config();
const express = require('express');
const MercadoPago = require('mercadopago');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

// Inicialização do app
const app = express();

// Configurações de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(',') || ['https://seusite.com']
}));
app.use(express.json({ limit: '10kb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite por IP
});
app.use('/auth', limiter);

// Conexão com MongoDB (produção)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true
}).then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro MongoDB:', err));

// Modelos
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    refreshTokens: [{
      token: String,
      expiresAt: Date
    }]
  }, {
    toJSON: {
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
      }
    }
  });
  
  UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });
  
  // Método para criar token de acesso
  UserSchema.methods.createAccessToken = function() {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
  };
  
  // Método para criar refresh token (adiciona à lista de tokens válidos)
  UserSchema.methods.createRefreshToken = async function() {
    const refreshToken = jwt.sign({ id: this._id }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    
    this.refreshTokens = this.refreshTokens.concat({
      token: refreshToken,
      expiresAt
    });
    
    await this.save();
    return refreshToken;
  };
  
  // Método para verificar refresh token
  UserSchema.methods.verifyRefreshToken = function(token) {
    try {
      jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      
      // Verifica se o token está na lista de tokens válidos
      const tokenExists = this.refreshTokens.some(
        t => t.token === token && t.expiresAt > new Date()
      );
      
      return tokenExists;
    } catch (err) {
      return false;
    }
  };
  
  // Método para revogar refresh token
  UserSchema.methods.revokeRefreshToken = async function(token) {
    this.refreshTokens = this.refreshTokens.filter(t => t.token !== token);
    await this.save();
  };
  
  const User = mongoose.model('User', UserSchema);

// Configuração de e-mail (produção)
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: process.env.SENDGRID_USER,
    pass: process.env.SENDGRID_PASS
  }
});

// Configuração Mercado Pago
MercadoPago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
  integrator_id: process.env.MP_INTEGRATOR_ID
});

// Middlewares
const authenticate = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
  
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Por favor, faça login para acessar'
      });
    }
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(404).json({
          status: 'fail',
          message: 'Usuário não encontrado'
        });
      }
  
      req.user = user;
      next();
    } catch (err) {
      // Verifica se o erro é de expiração
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'fail',
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(401).json({
        status: 'fail',
        message: 'Token inválido'
      });
    }
  };

// Rotas de Autenticação
app.post('/auth/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('name').notEmpty().trim().escape()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      const { email, password, name } = req.body;
  
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'fail',
          message: 'E-mail já cadastrado'
        });
      }
  
      const user = await User.create({ email, password, name });
  
      // Alteração aqui - Gera ambos os tokens
      const accessToken = user.createAccessToken();
      const refreshToken = await user.createRefreshToken();
  
      res.status(201).json({
        status: 'success',
        tokens: {
          access: accessToken,
          refresh: refreshToken
        },
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name
          }
        }
      });
    } catch (err) {
      console.error('Erro no registro:', err);
      res.status(500).json({
        status: 'error',
        message: 'Erro ao criar conta'
      });
    }
  });
  
  app.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({
          status: 'fail',
          message: 'E-mail ou senha incorretos'
        });
      }
  
      // Alteração aqui - Gera ambos os tokens
      const accessToken = user.createAccessToken();
      const refreshToken = await user.createRefreshToken();
  
      res.status(200).json({
        status: 'success',
        tokens: {
          access: accessToken,
          refresh: refreshToken
        },
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name
          }
        }
      });
    } catch (err) {
      console.error('Erro no login:', err);
      res.status(500).json({
        status: 'error',
        message: 'Erro ao fazer login'
      });
    }
  });
  
  // NOVA ROTA - Logout
  app.post('/auth/logout', authenticate, async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await req.user.revokeRefreshToken(token);
      }
      
      res.status(200).json({
        status: 'success',
        message: 'Logout realizado com sucesso'
      });
    } catch (err) {
      res.status(500).json({
        status: 'error',
        message: 'Erro ao fazer logout'
      });
    }
  });
  
  // NOVA ROTA - Refresh Token
  app.post('/auth/refresh', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'Token não fornecido'
      });
    }
  
    try {
      // Decodifica sem verificar ainda (para pegar o ID)
      const decoded = jwt.decode(token);
      if (!decoded?.id) throw new Error('Token inválido');
      
      const user = await User.findById(decoded.id);
      if (!user) throw new Error('Usuário não encontrado');
      
      // Verifica se o token é válido
      const isValid = user.verifyRefreshToken(token);
      if (!isValid) throw new Error('Token inválido');
      
      // Revoga o token antigo
      await user.revokeRefreshToken(token);
      
      // Cria novos tokens
      const newAccessToken = user.createAccessToken();
      const newRefreshToken = await user.createRefreshToken();
      
      res.status(200).json({
        status: 'success',
        tokens: {
          access: newAccessToken,
          refresh: newRefreshToken
        }
      });
    } catch (err) {
      res.status(401).json({
        status: 'fail',
        message: err.message || 'Token inválido ou expirado'
      });
    }
  });

// Rotas de Recuperação de Senha (Produção)
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'Se existir uma conta com este e-mail, um link será enviado'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hora

    await PasswordResetToken.create({
      token: resetToken,
      userId: user._id,
      expiresAt: resetTokenExpiry
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `
      <h2>Redefinição de Senha</h2>
      <p>Clique no link abaixo para redefinir sua senha:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>Este link expira em 1 hora.</p>
    `;

    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_FROM,
      subject: 'Redefinição de Senha',
      html: message
    });

    res.status(200).json({
      status: 'success',
      message: 'Link de redefinição enviado para seu e-mail'
    });
  } catch (err) {
    console.error('Erro ao solicitar reset:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao processar solicitação'
    });
  }
});

app.post('/auth/reset-password/:token', async (req, res) => {
  try {
    const resetToken = await PasswordResetToken.findOne({
      token: req.params.token,
      expiresAt: { $gt: Date.now() }
    });

    if (!resetToken) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token inválido ou expirado'
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'Usuário não encontrado'
      });
    }

    user.password = req.body.password;
    await user.save();

    await PasswordResetToken.deleteOne({ token: req.params.token });

    res.status(200).json({
      status: 'success',
      message: 'Senha redefinida com sucesso'
    });
  } catch (err) {
    console.error('Erro ao resetar senha:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao redefinir senha'
    });
  }
});

// Rota Protegida de Exemplo
app.get('/api/v1/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt
        }
      }
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao buscar dados do usuário'
    });
  }
});

// Rota do Mercado Pago (Produção)
app.post('/api/v1/payments/create-preference', authenticate, [
  body('items').isArray({ min: 1 }),
  body('items.*.name').notEmpty(),
  body('items.*.price').isFloat({ gt: 0 }),
  body('items.*.quantity').isInt({ gt: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { items } = req.body;

    const preference = {
      items: items.map(item => ({
        id: item.id || crypto.randomUUID(),
        title: item.name,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        picture_url: item.image || `${process.env.SITE_URL}/images/default-product.jpg`,
        description: item.description || ''
      })),
      payer: {
        name: req.user.name,
        email: req.user.email
      },
      payment_methods: {
        installments: 12,
        default_installments: 1
      },
      back_urls: {
        success: `${process.env.SITE_URL}/payment/success`,
        failure: `${process.env.SITE_URL}/payment/failure`,
        pending: `${process.env.SITE_URL}/payment/pending`
      },
      auto_return: "approved",
      external_reference: req.user.id,
      notification_url: `${process.env.API_URL}/api/v1/payments/webhook`,
      statement_descriptor: "KIDELI"
    };

    const response = await MercadoPago.preferences.create(preference);
    
    res.status(200).json({
      status: 'success',
      data: {
        id: response.body.id,
        init_point: response.body.init_point
      }
    });
  } catch (err) {
    console.error('Erro ao criar preferência:', err);
    res.status(500).json({
      status: 'error',
      message: 'Erro ao processar pagamento'
    });
  }
});

// Webhook para notificações
app.post('/api/v1/payments/webhook', express.json({ type: 'application/json' }), (req, res) => {
  try {
    const paymentId = req.body.data?.id;
    if (!paymentId) return res.status(400).send('Bad Request');

    // Processar notificação de pagamento
    console.log('Recebido webhook para pagamento:', paymentId);
    
    // Aqui você implementaria a lógica para atualizar o status do pedido
    
    res.status(200).send('OK');
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Erro interno no servidor'
  });
});

// Rotas adicionais para o frontend
app.get('/api/v1/profile', authenticate, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password');
      
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
      res.status(500).json({
        status: 'error',
        message: 'Erro ao buscar dados do usuário'
      });
    }
  });
  
  app.put('/api/v1/profile', authenticate, [
    body('email').optional().isEmail(),
    body('name').optional().trim().escape(),
    body('phone').optional().trim().escape()
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    try {
      const updates = req.body;
      const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');
  
      res.status(200).json({
        status: 'success',
        data: {
          user
        }
      });
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      res.status(500).json({
        status: 'error',
        message: 'Erro ao atualizar perfil'
      });
    }
  });

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} em modo ${process.env.NODE_ENV || 'development'}`);
});