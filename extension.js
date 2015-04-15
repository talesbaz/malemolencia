const Lang      = imports.lang;
const Gio       = imports.gi.Gio;
const GLib      = imports.gi.GLib;
const Gtk       = imports.gi.Gtk;
const St        = imports.gi.St;
const Main      = imports.ui.main;
const Clutter   = imports.gi.Clutter;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Shell     = imports.gi.Shell;
const Meta      = imports.gi.Meta;

const asciiTeclaReturn = 65293;
const asciiTeclaEnter  = 65421;

let oMalemolente;

let configuracao = {

  /**
   * Define qual navegador utilizara para abrir o link
   * @type {String}
   * @default xdg-open
   */
  navegador : 'google-chrome',

  /**
   * Define url para abrir as issues
   * @type {String}
   */
  url_redmine : 'http://redmine.dbseller.com.br:8888/search?q=',

  /**
   * Define url para o gerador de ambientes
   * @type {String}
   */
  url_gerador : 'http://ambientes.dbseller.com.br/?tag=',

  /**
   * Define o icone que ficará no dock
   * @see http://standards.freedesktop.org/icon-naming-spec/icon-naming-spec-latest.html
   * @type {String}
   * @default emblem-system || emblem-favorite
   */
  iconeDock : 'emblem-system',

  /**
   * Define o tamanho do icone que ficará no dock
   * @type integer
   * @default 20
   */
  iconeDockSize: 20

};

const Malemolente = new Lang.Class({

  Name : 'Malemolente',
  Extends : PanelMenu.Button,

  _init: function() {

    this.parent(St.Align.START);
    this.configuracao = configuracao;
    this.configuracao.navegador = this.configuracao.navegador + ' ';

    this.arquivoItens = GLib.get_home_dir() + "/itens.json";

    this.poolBotao = new St.Label({text:_("M+")});
    this.poolBotao.add_style_class_name("malemolenciaIcone");

    try{

      let iconeDefault = new Gio.ThemedIcon({ name: this.configuracao.iconeDock });
      let oIcone       = new St.Icon({ gicon: iconeDefault, icon_size: this.configuracao.iconeDockSize });
      this.actor.add_child( oIcone );
    } catch(e) {
      Main.notify("Erro ao criar icone.");
    }

    this.actor.add_actor(this.poolBotao);
    this.poolBotao.get_parent().add_style_class_name("containerIcone");

    this.criaSubMenu();
    this.criaMenu();
    this.adicionaSeparador();
    this.opcaoInputIssue();
    this.adicionaSeparador();
    this.opcaoInputGerador();
  },

  opcaoInputIssue: function(){

    let bottomSection = new PopupMenu.PopupMenuSection({style_class : 'item'});
    let self = this;

    this.oInputIssue = new St.Entry({ name: "inputIssue",
                                      hint_text: _("Pesquisa Redmine..."),
                                      track_hover: true,
                                      can_focus: true,
                                      style_class: "itemMenu" });

    let inputIssue = this.oInputIssue.clutter_text;
    inputIssue.set_max_length(40);
    inputIssue.connect('key-press-event', function(o,e){

      let teclaPressionada = e.get_key_symbol();

      if (teclaPressionada == asciiTeclaEnter ||
          teclaPressionada == asciiTeclaReturn) {

        try {

          GLib.spawn_command_line_async( self.configuracao.navegador + self.configuracao.url_redmine + o.get_text() );
          inputIssue.text = '';
          self.menu.close();
        } catch(e) {
          Main.notify("Erro ao Executar comando.");
        }
      }
    });

    bottomSection.actor.add_actor(this.oInputIssue);
    this.menu.addMenuItem(bottomSection);
  },

  opcaoInputGerador: function(){

    let bottomSection = new PopupMenu.PopupMenuSection({style_class : 'item'});
    let self = this;

    this.oInputGerador = new St.Entry({ name: "inputGerador",
                                        hint_text: _("Gerar Ambiente..."),
                                        track_hover: true,
                                        can_focus: true,
                                        style_class: "itemMenu" });

    let inputGerador = this.oInputGerador.clutter_text;
    inputGerador.set_max_length(40);
    inputGerador.connect('key-press-event', function(o,e){

      let teclaPressionada = e.get_key_symbol();

      if (teclaPressionada == asciiTeclaEnter ||
          teclaPressionada == asciiTeclaReturn) {

        try {

          GLib.spawn_command_line_async( self.configuracao.navegador + self.configuracao.url_gerador + o.get_text() );
          inputGerador.text = '';
          self.menu.close();
        } catch(e) {
          Main.notify("Erro ao Executar comando.");
        }
      }
    });

    bottomSection.actor.add_actor(this.oInputGerador);
    this.menu.addMenuItem(bottomSection);
  },

  criaMenu: function() {

    /**
     * @todo Mover links para json
     */
    this.adicionaOpcao("Ambientes",  this.configuracao.navegador + "ambientes.dbseller.com.br",    this.menu);
    this.adicionaOpcao("Downloader", this.configuracao.navegador + "dbdownloader.dbseller.com.br", this.menu);
    this.adicionaOpcao("Gera Patch", this.configuracao.navegador + "gerapatch.dbseller.com.br",    this.menu);
    this.adicionaOpcao("Utils",      this.configuracao.navegador + "utils.dbseller.com.br",        this.menu);
  },

  criaSubMenu: function() {

    let itensArquivo  = this.carregaItens();

    this.ClientesSubMenu = new PopupMenu.PopupSubMenuMenuItem(_("Acesso a Clientes"));
    for (let indice = 0; indice < itensArquivo.length; indice++) {
      this.adicionaOpcao( itensArquivo[indice].labelItem, this.configuracao.navegador + itensArquivo[indice].url , this.ClientesSubMenu.menu );
    }
    this.menu.addMenuItem( this.ClientesSubMenu );
  },

  adicionaSeparador: function() {
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  },

  adicionaOpcao: function(label, command, menu) {

    menu.addAction(_(label), function() {

      try {
        GLib.spawn_command_line_async(command);
      } catch(e) {
        Main.notify("Erro ao Executar comando.");
      }
    });
  },

  carregaItens: function(){

   try {

      let file = Gio.file_new_for_path( this.arquivoItens );
      if(!file) throw 'Error';

      let loaded = file.load_contents(null)[0];
      if (!loaded) throw 'Error';

      return JSON.parse(String(file.load_contents(null)[1]));

    } catch (error) {
      Main.notify( "Erro ao carregar arquivo de itens." + error );
    }
   return;
  }
});

function debug(mensagem) {

  let f   = Gio.file_new_for_path('/tmp/log');
  let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
  Shell.write_string_to_stream (out, mensagem);
  out.close(null);
  return;
}

function init() {

  try {

    if (!oMalemolente) {

      oMalemolente = new Malemolente();
      Main.panel.addToStatusArea('malemolencia', oMalemolente);
    }

  } catch (error) {
    Main.notify("Erro ao iniciar Malemolencia.");
  }
}

function enable() {}

function disable() {

  if (oMalemolente) {

    oMalemolente.destroy();
    oMalemolente = null;
  }
}
