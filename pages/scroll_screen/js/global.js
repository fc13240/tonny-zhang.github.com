$(function(){
	var $sub_nav = $('.sub_nav div');
		var $items = $('.item');
		var currentItemIndex = 0,
			maxItemIndex = $items.length-1;
		$.get('./aboutUs.html',function(html){
			var $html = $(html).appendTo($('.container'));
			$items = $('.item');
			maxItemIndex = $items.length-1;
			var $username = $html.find('[name=username]'),
				$tel = $html.find('[name=tel]'),
				$email = $html.find('[name=email]'),
				$content = $html.find('[name=content]');
			var REG_TEL = /^(\+86-)?1[3|5|7|8|][0-9]{9}$|^(\d{3,4}-)?\d{7,8}$/,
				REG_EMAIL = /^[a-z0-9]([a-z0-9\.]*[-_]?[a-z0-9\.]+)*@([a-z0-9]*[-_]?[a-z0-9]+)+[\.][a-z]{2,3}([\.][a-z]{2})?$/i;
			function checkTel(tel){
				return REG_TEL.test(tel);
			}
			function checkEmail(email){
				return REG_EMAIL.test(email);
			}
			var $form_feedback = $('#form_feedback').on('submit',function(e){
				var isHaveError = false;
				var username = $username.removeClass('error').val();
				if(!username){
					$username.addClass('error');
					isHaveError = true;
				}
				var tel = $tel.removeClass('error').val();
				if(!tel || !checkTel(tel)){
					$tel.addClass('error');
					isHaveError = true;
				}
				var email = $email.removeClass('error').val();
				if(!email || !checkEmail(email)){
					$email.addClass('error');
					isHaveError = true;
				}
				var content = $content.removeClass('error').val();
				if(!content){
					$content.addClass('error');
					isHaveError = true;
				}
				if(isHaveError){
					alert('请确保您填写的信息正确！');
				}else{
					$.post('./feedback/save.php',{
						username: username,
						tel: tel,
						email: email,
						content: content
					},function(result){
						if(result){
							alert('您的留言我们已经收到！');
						}else{
							alert('出现异常');
							return location.reload();
						}
						$form_feedback.get(0).reset();
					});
				}
				e.preventDefault();
				return false;
			});
		})
		function showItem(){
			isAnimating = true;
			$body.animate({
				scrollTop: $items.eq(currentItemIndex).offset().top
			},function(){
				isAnimating = false;
			});
		}
		var wheelTT;
		var isAnimating = false;
		var $body = $('body,html').on('mousewheel',function(e){
			var wheelDelta = window.event.detail?-(window.event.detail||0)/3:window.event.wheelDelta/120;
			clearTimeout(wheelTT);
			wheelTT = setTimeout(function(){
				wheelDelta<0? currentItemIndex++:currentItemIndex--;
				currentItemIndex < 0 && (currentItemIndex = 0);
				currentItemIndex > maxItemIndex && (currentItemIndex = maxItemIndex);
				showItem();
			},300);
			e.preventDefault();
		});
		$('.btn_next').click(function(){
			currentItemIndex++;
			showItem();
		});
		var scrollTT,resizeTT;
		var $win = $(window);
		var height_win = $win.height();
		$win.on('resize',function(){
			clearTimeout(resizeTT);
			resizeTT = setTimeout(function(){
				height_win = $win.height();
			},100);
		}).on('scroll',function(){
			clearTimeout(scrollTT);
			scrollTT = setTimeout(function(){
				var scrollTop = $win.scrollTop();
				var index = scrollTop/height_win;
				var select_index = index%1 > 0?Math.ceil(index):Math.floor(index);
				$sub_nav.removeClass('on').eq(select_index).addClass('on');
				currentItemIndex = select_index;
			},200);
		}).on('keydown',function(e){
			var code = e.which;
            if (code == 40) {
            	if(currentItemIndex+1 > maxItemIndex){
            		return;
            	}
                currentItemIndex++;
                showItem();
            } else if (code == 38) {
            	if(currentItemIndex == 0){
            		return;
            	}
                currentItemIndex--;
                showItem();
            }
		});
		$win.resize();
});