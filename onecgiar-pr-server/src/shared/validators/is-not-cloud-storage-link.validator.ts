import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import {
  CLOUD_STORAGE_LINK_MESSAGE,
  isCloudStorageLink,
} from '../constants/cloud-storage-link.constant';

@ValidatorConstraint({ name: 'isNotCloudStorageLink', async: false })
export class IsNotCloudStorageLinkConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    // Absent or non-string values are somebody else's rule (@IsNotEmpty, @IsUrl).
    if (typeof value !== 'string') {
      return true;
    }
    return !isCloudStorageLink(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return CLOUD_STORAGE_LINK_MESSAGE;
  }
}

/**
 * Rejects links hosted on the file-storage platforms PRMS does not accept as evidence.
 * See `cloud-storage-link.constant.ts` for why the rule exists and where it is mirrored.
 */
export function IsNotCloudStorageLink(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotCloudStorageLinkConstraint,
    });
  };
}

// @akili-spec bilateral/evidence-privacy-tag (EVP-DD-4)
@ValidatorConstraint({
  name: 'isNotCloudStorageLinkUnlessPrivate',
  async: false,
})
export class IsNotCloudStorageLinkUnlessPrivateConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    // Only an explicit `false` on the same item lifts the refusal; null, true and absent keep it.
    if ((args.object as { is_public?: unknown })?.is_public === false) {
      return true;
    }
    if (typeof value !== 'string') {
      return true;
    }
    return !isCloudStorageLink(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return CLOUD_STORAGE_LINK_MESSAGE;
  }
}

/**
 * Same refusal as `IsNotCloudStorageLink`, skipped only when the sibling `is_public` is
 * strictly `false` (a link the centre marks private is stored but never exposed).
 */
export function IsNotCloudStorageLinkUnlessPrivate(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotCloudStorageLinkUnlessPrivateConstraint,
    });
  };
}
