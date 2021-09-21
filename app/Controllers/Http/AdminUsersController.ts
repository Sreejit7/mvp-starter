import { HttpContextContract } from "@ioc:Adonis/Core/HttpContext";
import CreateAdminUserValidator from "App/Validators/CreateAdminUserValidator";
import UpdateUserValidator from "App/Validators/UpdateUserValidator";
import { createConfirmDeleteLink } from "App/Services/HelpersService";
import Database from "@ioc:Adonis/Lucid/Database";
import User from "App/Models/User";
import roles from "Config/roles";
import UserService from "App/Services/UserService";

interface updateValues {
  email: string;
  name: string;
  roles: string[];
  password?: string;
}

export default class AdminUsersController {
  // controller config
  private entityTable = "users";
  private entityModel = User;
  private entityService = UserService;
  private entityListPath = "/admin/users";
  private entityIndexView = "pages/admin/users";
  private entityFormView = "pages/admin/userForm";
  private entityCreateValidator = CreateAdminUserValidator;
  private entityUpdateValidator = UpdateUserValidator;
  private entityFormAction = (entity) => {
    return "/admin/users/" + entity.id;
  };
  private entityCreationNotification = () => "L'utilisateur a été crée";
  private entityUpdateNotification = () => "L'utilisateur a été mis à jour";
  private entityDeleteNotification = () => "L'utilisateur a été supprimé";

  /**
   * Liste des posts pour l'admin
   */
  public async index({ view, request, bouncer }: HttpContextContract) {
    await bouncer.authorize("adminListUsers");
    const page = request.input("page", 1);
    const limit = 20;
    const entities = await Database.from(this.entityTable).paginate(
      page,
      limit
    );
    entities.baseUrl(this.entityListPath);

    // add delete links and edit Links for each post.
    entities.forEach((entity) => {
      const deleteLink = createConfirmDeleteLink({
        id: entity.id,
        title: `Étes vous sûr de vouloir supprimer l'utilisateur "${entity.name}" ?`,
        formAction: `${this.entityListPath}/${entity.id}?_method=DELETE`,
        returnUrl: this.entityListPath,
      });
      entity._deleteLink = deleteLink;
      entity._editLink = `${this.entityListPath}/${entity.id}/edit`;
    });

    return view.render(this.entityIndexView, { entities });
  }

  public async create({ view, bouncer }: HttpContextContract) {
    await bouncer.authorize("adminCreateUser");
    const formValues = this.entityService.prepareFormValues();
    return view.render(this.entityFormView, {
      roles,
      formValues,
      formAction: this.entityListPath,
    });
  }

  public async store({
    session,
    request,
    response,
    bouncer,
  }: HttpContextContract) {
    await bouncer.authorize("adminCreateUser");
    let payload = await request.validate(this.entityCreateValidator);
    // form let us choose only on options, but we store roles as en array in database.
    const userValues = {
      email: payload.email,
      name: payload.name,
      password: payload.password,
      roles: [payload.role],
    };
    await this.entityModel.create(userValues);
    session.flash({
      notification: this.entityCreationNotification(),
    });
    response.redirect(this.entityListPath);
  }

  public async show({}: HttpContextContract) {}

  public async edit({ view, request, bouncer }: HttpContextContract) {
    await bouncer.authorize("adminEditUser");
    const entity = await this.entityModel.findOrFail(request.param("id"));
    const formValues = this.entityService.prepareFormValues(entity);
    return view.render(this.entityFormView, {
      roles,
      formValues,
      formAction: this.entityFormAction(entity) + "?_method=PUT",
    });
  }

  public async update({
    request,
    session,
    response,
    bouncer,
  }: HttpContextContract) {
    await bouncer.authorize("adminEditUser");
    const payload = await request.validate(this.entityUpdateValidator);
    // form let us choose only on options, but we store roles as en array in database.
    const entity = await User.findOrFail(payload.id);
    const values: updateValues = {
      email: payload.email,
      name: payload.name,
      roles: [payload.role],
    };
    if (payload.password && payload.password_confirmation) {
      values.password = payload.password.trim();
    }
    await entity.merge(values).save();
    session.flash({ notification: this.entityUpdateNotification() });
    response.redirect(this.entityListPath);
  }

  public async destroy({
    request,
    response,
    session,
    bouncer,
  }: HttpContextContract) {
    await bouncer.authorize("adminDeleteUser");
    const user = await this.entityModel.find(request.param("id"));
    if (user) {
      user.delete();
      session.flash({ notification: this.entityDeleteNotification() });
      response.redirect(this.entityListPath);
    }
  }
}
