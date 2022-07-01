from django.db import models
from django.core.validators import RegexValidator
from django.utils.translation import gettext as _
import re

comma_separated_float_list_re = re.compile('^([-+]?\d*\.?\d+[,\s]*)+$')
validate_comma_separated_float_list = RegexValidator(
              comma_separated_float_list_re, 
              _(u'Enter only floats separated by commas.'), 'invalid')

class CommaSeparatedFloatField(models.CharField):
    default_validators = [validate_comma_separated_float_list]
    description = _("Comma-separated floats")

    def formfield(self, **kwargs):
        defaults = {
            'error_messages': {
                'invalid': _(u'Enter only floats separated by commas.'),
            }
        }
        defaults.update(kwargs)
        return super(CommaSeparatedFloatField, self).formfield(**defaults)